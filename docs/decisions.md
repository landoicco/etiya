# Decisions

*For reviewers, and for future me: why the project looks the way it does.*

Each entry is a choice that had alternatives worth considering, including the ones that were rejected.

## Three Lambdas, one per domain

One Lambda for gyms, one for exercises, one for workouts, all deploying the **same jar** and selecting their handler with `SPRING_CLOUD_FUNCTION_DEFINITION`.

The split buys separate metrics, logs and configuration per domain, and lets one domain fail without taking the others down. It does **not** make the code smaller or the cold start faster, since each Lambda still loads the full Spring context. With little traffic it also means each function goes cold more often, which is why SnapStart matters.

Rejected: a single Lambda for everything (fewer cold starts but no isolation), and one Lambda per route (more moving parts than three domains justify).

## AWS-specific edge, portable core

The handlers speak `APIGatewayV2HTTPEvent` and route on the event's `routeKey`. Everything below them — services, models, repository interfaces — has no AWS types.

The original design used generic Spring Cloud Function signatures for portability, but that portability was already lost elsewhere: DynamoDB key design, Cognito and the CDK are all AWS. Keeping generic signatures also meant no access to the `routeKey`, path parameters, query parameters or JWT claims, since the adapter only forwards the body and HTTP headers.

The rule that remains: **no AWS type travels past `api/apigateway` or `repository/dynamo`.** Migrating clouds would mean rewriting those two thin edges, not the domain.

Rejected: `spring-cloud-function-serverless-web`, which would keep portable `@RestController`s but adds Spring MVC startup cost, and its handling of Cognito claims was unverified.

## A local bridge instead of a second HTTP layer

`core/src/local/java` holds a controller that turns any local HTTP request into the same API Gateway event AWS would send, including fake JWT claims built from the `X-User-Id` header.

This means local and AWS execute the same handlers, and the same Bruno tests validate both. The alternative — plain `@RestController`s for local use — would have defined every route twice and tested different code than production. The bridge lives in a source folder only the `local` profile compiles, so it cannot reach Lambda.

## Package layout: layer, then technology

```
api/            portable HTTP layer
api/apigateway/ AWS implementation
api/local/      local implementation (src/local/java)
repository/     interfaces
repository/dynamo/       DynamoDB implementation + client config
repository/dynamo/local/ local client + table initializer (src/local/java)
```

An earlier `aws/` package at the root was renamed: naming by provider broke the pattern `repository/dynamo` already followed. There is no `config/` package; configuration lives with the layer it configures.

## Routes designed for a future frontend

* Resources and HTTP verbs (`POST /gyms`), not actions (`POST /registerGym`).
* `/me/workouts`, never `/users/{userId}/workouts`, so **the client never sends its own user ID**. Adding Cognito did not change a single route.
* Lists return `{ items, nextCursor }` from the start, so adding pagination was not a breaking change.
* No `/v1` prefix yet. There are no clients to break, and a version can later be introduced through a custom domain mapping without touching code.

## Workout IDs are ULIDs, times are UTC instants

See [the data model](data-model.md#workout-ids-are-ulids) for the mechanics. The short version: the ID is derived from `startedAt`, so one sort key serves both "get by ID" and "list by date", with no GSI and no timezone ambiguity.

Both `startedAt` and `endedAt` are required because **the database only stores completed workouts**. A session in progress belongs on the client (localStorage or IndexedDB), which also makes the app usable in a gym with bad signal.

## Server-generated IDs and 409 on duplicates

Catalog IDs are slugs derived from the payload, and any `id` in the request is ignored. Creation uses a conditional write, so registering the same gym twice returns `409` instead of silently overwriting the stored one.

For gyms, the slug includes the optional branch and the city, so two locations of the same chain coexist. The city is part of the ID because branches of one chain can share a name across cities.

Known limitation: `city` is free text, so `Monterrey` and `Monterrey, NL` produce different IDs. Google Places (`place_id`) is the real fix, and can be added later without changing the model.

## Cognito from the first deploy

Self sign-up is disabled, so only an administrator creates users. The JWT authorizer sits on **every** route, which means unauthenticated traffic is rejected by API Gateway before any Lambda runs.

Adding auth later would have meant a temporary mechanism to throw away. Instead, identity comes from the `sub` claim in both environments, with the local bridge providing it.

Rejected for dev testing: IAM authorizers (secure but thrown away once a frontend exists), a Lambda authorizer with a shared secret (custom code to maintain), and relying on an unpublished URL (not a control at all).

## Provisioned DynamoDB, SnapStart behind an alias

The table is provisioned at 5/5 because the always-free tier covers provisioned capacity, while on-demand bills from the first request. SnapStart is enabled and each Lambda is exposed through a `live` alias, because **SnapStart only applies to published versions**: pointing the API at the function directly would silently disable it.

Throttling and access logs on the stage are set through an escape hatch (`CfnStage`), since the L2 construct does not expose the default stage's settings. That is the most fragile code in the stack and the first thing to check if a CDK upgrade breaks synthesis.

## Security rules checked on every synth

[cdk-nag](https://github.com/cdklabs/cdk-nag) runs the *AwsSolutions* rules on every `cdk synth`, so CI fails on any finding that is neither fixed nor acknowledged. An acknowledgment requires a written reason, and it lives next to the resource it applies to.

The first run found nine issues. Three were fixed, since they cost nothing or close to it:

* **Stronger password policy**, now requiring symbols. It applies the next time a password is set.
* **Access logs on the API.** Requests rejected with `401` never reach a Lambda, so before this they left no trace at all.
* **Point-in-time recovery on the table**, billed per GB of data, which here is a fraction of a cent.

The rest are acknowledged, each with a trigger in [still open](#still-open):

| Rule | Why it is accepted today |
|---|---|
| MFA not required, Cognito *Plus* plan not used | A single user in dev. *Plus* is paid, and required MFA would break the CLI login Bruno uses |
| AWS managed policy on the Lambda roles | `AWSLambdaBasicExecutionRole` only grants writing logs |
| Lambda runtime is not the latest | Java 21 is LTS; moving to 25 changes the whole toolchain at once |
| SnapStart without a published version | A false positive: each function publishes one behind the `live` alias |

## Infrastructure as a separate Maven project

`infra/` has its own `pom.xml` and no parent project. It changes for different reasons than `core`, and `aws-cdk-lib` must never end up in the Lambda jar. The price is duplication that has to be kept in sync by hand: function names, route keys and table keys.

## Per-deployment values stay out of the repo

`bruno-tests/environments/Dev.bru` is ignored and a `Dev.example.bru` with placeholders is versioned instead. The API URL and the Cognito user belong to whoever deployed the stack, and publishing a live URL invites traffic that is billed even when it is rejected.

## Still open

Deliberately postponed, with the trigger that would justify each:

| Item | Do it when |
|---|---|
| Idempotency for workout writes (client-generated ULID, re-stamped with `startedAt`) | The frontend retries failed uploads |
| Reserved concurrency per Lambda and a lower stage throttle | Before the API is shared with anyone |
| `gymName` read from the catalog instead of trusting the client | The frontend shows gyms in the history |
| `PUT` / `DELETE` for workouts | The app can edit or delete |
| A Cognito `admin` group gating catalog writes, and MFA | There are users other than the owner |
| Narrower IAM: per-item-type conditions instead of `grantReadWriteData`, and an inline logs policy instead of the managed one | Tightening dev into something production-shaped |
| Java 25: Lambda runtime, flake JDK, Docker images and compiler release together | Spring or a dependency needs it, or Java 21 nears end of support on Lambda |
| Unit tests for `Slugs`, time normalization and key building | The suite stops being enough |
| Measuring the real cold start in CloudWatch | Latency becomes a complaint |
