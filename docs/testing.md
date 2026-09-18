# Testing

*For running the suite against either environment, and knowing what it covers.*

The suite is a set of plain-text integration tests written for **Bruno**. No graphical client is needed; the Nix shell bundles the CLI (`bru`).

## Against the local stack

With `docker compose up` running:
```bash
cd bruno-tests && bru run --env Local
```

> **Run the suite against a fresh database.** Gyms and exercises cannot be created twice (the API answers `409 Conflict`), so a second run over the same data fails on the registration tests. DynamoDB Local is in memory, so restarting the stack wipes it:
> ```bash
> docker compose down -v && docker compose up --build
> ```

## Against AWS

The same tests run against the deployed API with the `Dev` environment. Every request needs a Cognito token, which the collection sends as `Authorization: Bearer {{authToken}}`. The token is passed on the command line, so it is never written to a file:

```bash
TOKEN=$(aws cognito-idp initiate-auth --auth-flow USER_PASSWORD_AUTH \
  --client-id <CLIENT_ID> \
  --auth-parameters USERNAME=you@example.com,PASSWORD='<PASSWORD>' \
  --query 'AuthenticationResult.AccessToken' --output text)

cd bruno-tests && bru run --env Dev --env-var authToken="$TOKEN" --exclude-tags local-only
```

Tokens last one hour; when one expires, request another.

The `Dev` environment is **not versioned**, since the API URL and the user belong to whoever deployed the stack. Create yours from the example and fill in the values `cdk deploy` printed:
```bash
cp bruno-tests/environments/Dev.example.bru bruno-tests/environments/Dev.bru
```
Note that `userId` there is the Cognito `sub`, not `user-default` as in the local environment.

To repeat the full suite against AWS, delete the catalog items from the previous run first, or the registration tests get `409`:
```bash
aws dynamodb delete-item --table-name <TABLE_NAME> \
  --key '{"PK":{"S":"GYM"},"SK":{"S":"GYM#golds-gym-sunset-st-los-angeles"}}'
```

## The `local-only` tag

Four tests are tagged `local-only` and excluded when running against AWS, because they depend on how the local bridge fakes identity:

* Two expect `401` without a user. On AWS, API Gateway rejects those before any code runs, and the collection always sends a token.
* Two check that a user cannot see another user's workouts, using the `X-User-Id` header. On AWS the identity comes from the token, so verifying this would need a second Cognito user.

## What is covered

Registration and retrieval for the three domains, prefix search, filtering by muscle group, slug normalization, pagination with cursors, and the error paths: validation, malformed JSON, unknown IDs, duplicates (`409`), unauthenticated requests, invalid `limit` and forged cursors.

That is 34 requests locally and 30 against AWS, the difference being the four `local-only` tests.

There are no unit tests yet; the suite is the safety net.
