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

**Retries are made safe by the ID itself.** The app's offline queue sends a finished workout until it gets an answer, and a lost response would otherwise store it twice. The client generates a ULID once per workout and sends it on every attempt; the server keeps its random part, stamps the time from `startedAt`, and writes conditionally. A repeat gets `200` with the stored workout. Rejected alternatives:

* **An `Idempotency-Key` header**, the Stripe approach: it needs a second item per request, with a TTL, to remember responses, when the workout's own ID can already be the key.
* **`PUT /me/workouts/{id}`**, idempotent by HTTP semantics: a new route in `core` and `infra`, and the ID in the path would have to agree with `startedAt` in the body. Stamping the time on the server removes that coupling.
* **Comparing the body on a repeat and answering `409` when it differs**: it only happens if the client reuses an ID for another workout, which is a bug in the client. The stored workout is returned as is.

Both `startedAt` and `endedAt` are required because **the database only stores completed workouts**. A session in progress belongs on the client (localStorage or IndexedDB), which also makes the app usable in a gym with bad signal.

## Server-generated IDs and 409 on duplicates

**The catalog is shared, and every user adds to it.** Gyms and exercises are not owned by anyone: a user who does not find theirs registers it, and everybody else finds it from then on. Two users typing the same name land on the same slug and the second gets `409`, which the app treats as "select the existing one". Names that differ more than that, like "Bench Press" and "Press de banca", become two entries: detecting synonyms would need curated aliases or fuzzy matching, and fuzzy matching gets "Pull-up" and "Chin-up" wrong. The app makes searching easier than creating instead, and the muscle groups and categories come from fixed lists so at least those cannot drift.

Catalog IDs are slugs derived from the payload, and any `id` in the request is ignored. Creation uses a conditional write, so registering the same gym twice returns `409` instead of silently overwriting the stored one. Workouts use the same conditional write, but a repeat is a retry rather than a conflict, so it returns the stored workout, [see above](#workout-ids-are-ulids-times-are-utc-instants).

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
| No access logs on the web bucket or the distribution | Both would need a log bucket; the files are public by design and the API access logs record every call that matters |
| No WAF or geo restriction on the distribution | WAF is billed per web ACL and per request, and the distribution only serves static files |
| TLS 1.0 allowed for viewers | The default `cloudfront.net` certificate does not allow choosing the minimum version; a custom domain does |

cdk-nag 3 matches acknowledgments by exact ID, walking up from the resource to its parents. Rules that report one finding per permission, like `AwsSolutions-IAM5[Action::s3:List*]`, need one acknowledgment each.

## Infrastructure as a separate Maven project

`infra/` has its own `pom.xml` and no parent project. It changes for different reasons than `core`, and `aws-cdk-lib` must never end up in the Lambda jar. The price is duplication that has to be kept in sync by hand: function names, route keys and table keys.

## Per-deployment values stay out of the repo

`bruno-tests/environments/Dev.bru` is ignored and a `Dev.example.bru` with placeholders is versioned instead. The API URL and the Cognito user belong to whoever deployed the stack, and publishing a live URL invites traffic that is billed even when it is rejected.

The web app follows the same rule: it reads those values from a `config.json` that the deploy script writes next to the build, never from the source or from build-time variables.

The AWS account ID never appears in versioned files either. It is not a credential, but a public repo has no reason to carry it, and anything that would need it, like an acknowledgment naming the CDK assets bucket, is avoided.

## The frontend is a PWA

The app is meant to be used with one hand, between sets, on a phone. A progressive web app opens from a link with nothing to install, and a service worker keeps it working with bad signal. Vite, React, TypeScript and Tailwind are mainstream choices that need no justification to whoever reads the code next.

* **The workout in progress lives on the phone**, in IndexedDB, and is sent once finished. A send that fails waits in a queue and is retried when the app opens or the connection returns; iOS has no Background Sync. Those retries are why workout idempotency comes before any other API change.
* **The set logger is pinned to the bottom of the screen** and the workout scrolls above it. Everything tapped repeatedly during a set — the steppers, the unit, "Log set" — stays under the thumb of the hand holding the phone, and never moves as the exercise list grows. The logic behind it is a set of pure functions in [`web/src/workout.ts`](../web/src/workout.ts), which is what the unit tests cover; the screens themselves are not tested.
* **The exercise catalog is downloaded whole and searched on the phone.** `GET /exercises` takes no limit and sends no cursor, so one request brings all of it; it is kept in IndexedDB and seeded into the query cache before the first render. That buys a picker that answers as fast as the typing, a substring search instead of the prefix one the API does, and a catalog that still works in a basement. It stops being the right trade when the catalog outgrows a single response, which is also when the API will need paging.
* **The history pages by a button, not by scrolling.** A tap is honest about costing a request, and an infinite scroll is easy to trigger by accident on a phone held in one hand. The home screen shows the ten most recent and only offers "See all" when the API says there is a next page, so the link never leads to the same list again.
* **A workout opened from a list is already in hand.** The detail screen seeds itself from whichever list already holds that workout, so it appears with no wait and reads the same with no signal, and only fetches when it was opened cold, by a link or a reload. Nothing refreshes it afterwards, because a stored workout cannot change: there is no `PUT` yet.
* **The URL says what is on screen, sheets included.** A phone's back gesture is the app's main way out of anything, and without this it leaves the app instead of closing what is on top. So there is no separate stack of open sheets to keep in step with the browser's: picking an exercise is `/workout/exercises`, adding one is `/workout/exercises/new`, and closing either is the same `history.back()` the gesture performs. The router is [forty lines of our own](../web/src/router.ts) rather than a library, because parsing seven paths is not worth a dependency, and its parsing is where the tests are. The typed name of a new exercise rides in the history entry instead of the path: it is a half-finished thought, not something worth linking to. Deep links already work, since CloudFront falls back to `index.html` and so does the service worker.
* **Backing out of a workout in progress bounces back into it**, which costs a dead press and, twice, leaves the app. That is not a problem worth solving: the workout lives in IndexedDB, so leaving loses nothing and reopening lands straight back on it.
* **The app asks the browser to keep its storage, and says so when it will not.** A finished workout lives only on the phone until it reaches the API, and a browser may clear a site's storage to reclaim space; Safari does it to sites that have not been opened for a few days. [`navigator.storage.persist()`](../web/src/storage.ts) takes that right away. It is asked for once at startup rather than when the first workout is saved, so the guarantee is already in place before there is anything to lose — the cost being that Firefox, the only browser that puts the question to the person, asks it before the reason is obvious. Nothing is nagged: the warning appears only when a workout is actually waiting *and* the browser refused, and it says the one thing that turns the refusal into a yes, which is adding the app to the home screen. Safari grants it to a home-screen app, Chrome to one it considers installed.
* **Finishing a workout queues it; the queue sends it.** The finish button writes the request to IndexedDB and returns to the home screen without waiting for anything, because the gym is the one place a phone reliably has no signal. The queue is emptied when the app opens and whenever the connection returns, which together cover walking out and opening the app on the way home; iOS has no Background Sync to do better. Sending is sequential, so workouts keep the order they were finished in, and the first one that cannot reach the API stops the rest from trying. A repeat is safe because the request carries the client ULID, so a send that actually went through the first time answers `200` with the stored workout. A `4xx` other than `401` or `429` is the API meaning it: that workout is marked on the home screen with the reason and can only be discarded, rather than retried forever.
* **A workout longer than twelve hours is saved with its end capped**, not thrown away. The API refuses anything longer and would refuse it forever, so an unfinished workout from the night before would sit in the queue for good. The summary shows the duration before anything is sent, so the absurd number is visible rather than silent. Recording the time of the last set, which would give a truthful end instead, is in [still open](#still-open).
* **The gym is chosen when the workout starts, not when it ends.** Where you are is known before the first set and awkward to recall after the last one, and the end of a workout should be one button. So "Start workout" opens the gym list, every row starts the workout there, and the gym of the previous workout sits on top: training where you always train is one tap. It stays optional, because training at home must not be a dead end. The gym is remembered per device rather than per account, since it is about where this phone has been.
* **The app builds slugs the same way the API does.** An exercise's id is the slug of its name, so [`web/src/catalog.ts`](../web/src/catalog.ts) repeats `Slugs.of` step for step, and its tests are the cases from `SlugsTest` copied over. That is what lets the app recognize an exercise the catalog already holds, and land on the right one when a registration comes back `409` because somebody added it first.
* **The screen is kept awake while a workout is open**, through the Wake Lock API, and the lock is taken again whenever the app returns to the foreground, since browsers drop it on the way out. A browser without the API simply does not get it: the alternative, a hidden looping video, is a battery cost and a hack.
* **Login is the app's own form, using Amplify Auth with SRP**, so the password never travels to the server. The Cognito Hosted UI would mean a redirect to a generic page, which breaks the feel of an app on a phone.
* **S3 and CloudFront, on the default `cloudfront.net` domain.** Service workers require HTTPS, which that domain already has, and CloudFront's always-free tier covers personal use. A custom domain costs about $12 a year and can be added later without other changes.
* **The bucket is private** and only CloudFront can read it, through Origin Access Control. S3 website hosting would need a public bucket and serves HTTP only.
* **Caching is decided by CloudFront, not by S3 metadata.** Files under `/assets/*` carry a content hash in their name, so they are cached for a year as `immutable`. Everything else is never cached, because a stale `index.html` or service worker would keep phones on an old version. That makes invalidations unnecessary. Deep links fall back to `index.html` on a 403 or 404, since the app routes in the browser.
* **The app is uploaded by a script, not by the CDK.** `BucketDeployment` would add a Lambda of the CDK's own to the stack, which needs nine cdk-nag acknowledgments, one of them naming the account's assets bucket. [`web/scripts/deploy.sh`](../web/scripts/deploy.sh) runs `aws s3 sync` instead, so a UI change never goes through CloudFormation. The cost is a second command, and emptying the bucket by hand before `cdk destroy`.
* **Stack values reach the app at runtime**, through a `config.json` written next to the build. One build works for any stack, and changing the API does not mean rebuilding the app.
* **Development runs against the dev API on AWS**, not the Docker stack, so the real login is exercised from day one. The alternative needed a mode without login that would exist only for development.

## Still open

Deliberately postponed, with the trigger that would justify each:

| Item | Do it when |
|---|---|
| Reserved concurrency per Lambda, which needs the account's limit of 10 concurrent executions raised first, since Lambda keeps 10 unreserved | Real traffic, not the prospect of it. The stage already throttles at 10 requests a second, which with SnapStart-warm invocations of a few hundred milliseconds is three or four concurrent executions: the throttle bites long before the account limit does, and it is also what guards the budget. A queue in front of writes would not change this either — reads cannot be queued, writes would lose the `201`/`200` answer that makes them retry-safe, and the retry queue that role needs already runs on the phone |
| Duration and distance on sets, so cardio is logged as time or kilometers rather than a count | Logging cardio becomes common |
| **What you lifted last time on the same exercise**, in two parts: the first set of an exercise starting from those reps and that weight instead of from `10 × 0`, and the previous session's sets shown under the exercise, so progress is visible while training rather than only in the history. Within one workout this already happens, through `nextSet`. Across workouts it needs the last session for a given exercise, which the phone only has for whatever the cached lists hold: either a map kept on the device and updated whenever a workout is finished, or the API answering it, which would be a new route | Right after the MVP. Nobody remembers what they lifted, not even from two days ago, which is a large part of why a log is worth keeping at all: this is close to the point of the app rather than a nicety |
| The time of the last set recorded on the workout in progress, so a workout somebody forgot to finish ends when the training did instead of at the twelve hour cap | Forgetting to finish turns out to be common |
| Deploying the web app from CI, with an AWS role assumed through GitHub OIDC instead of stored keys, running the same `deploy.sh` | Deploying by hand becomes a chore, or someone else contributes |
| A custom domain, which also allows TLS 1.2 as the minimum | The app is shared beyond a link on a profile |
| `gymName` read from the catalog instead of trusting the client | The frontend shows gyms in the history |
| `PUT` / `DELETE` for workouts | The app can edit or delete |
| Moderating the shared catalog (reporting, merging or hiding entries) and MFA | There are users other than the owner |
| Aliases on catalog exercises ("also known as"), so a search for one name finds the other | Near-duplicate exercises start to get in the way |
| A workout's split ("Push day") derived from its exercises' categories and shown in the history | The history screen exists |
| Narrower IAM: per-item-type conditions instead of `grantReadWriteData`, and an inline logs policy instead of the managed one | Tightening dev into something production-shaped |
| Java 25: Lambda runtime, flake JDK, Docker images and compiler release together | Spring or a dependency needs it, or Java 21 nears end of support on Lambda |
| Measuring the real cold start in CloudWatch | Latency becomes a complaint |
| A smaller Lambda jar: it is 54 MB, mostly Netty, Reactor, WebFlux and native QUIC libraries for every OS, none of them used on Lambda | Deploys or cold starts become slow. Trim with the integration suite against AWS as the safety net |
| Slugs for non-Latin alphabets: `ß` and `Ø` are dropped, Cyrillic produces an empty slug and the item is rejected | A user needs names in another alphabet. Needs transliteration (ICU) |
