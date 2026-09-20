# Testing

*For running the suite against either environment, and knowing what it covers.*

Three layers:

* **Unit tests** for the logic with the most edge cases, on both sides. Plain JUnit for the API, no Spring context and no database; **Vitest** for the web app. Both run in milliseconds.
* **An integration suite** of plain-text requests written for **Bruno**, run against the local stack or the deployed API. No graphical client is needed; the Nix shell bundles the CLI (`bru`).

## API unit tests

```bash
cd core && mvn test
```

| Test | What it pins down |
|---|---|
| `SlugsTest` | Accents, apostrophes and symbols, and that a partial search is a prefix of the full ID |
| `WorkoutServiceTest` | Time normalization to UTC, the 12 hour and future limits, ULIDs sorting by start time, client IDs keeping their random part and landing on the same ID when retried, the owner coming from the token, page size limits |
| `TableSchemaFactoryTest` | `PK`/`SK` for each item type, enums stored by name, and no key at all when a part is missing |
| `WorkoutCursorsTest` | Cursors are URL-safe, and anything the API did not issue is rejected |
| `RequestBodyReaderTest` | A value outside a fixed list names the field and the accepted values, however deeply nested |

`SlugsTest` also records a known limitation: letters outside the Latin alphabet are dropped, so `Жим лёжа` produces an empty slug. See [still open](decisions.md#still-open).

## Web app unit tests

```bash
cd web && npm test          # once
cd web && npm run test:watch # re-runs on save
```

The screens are not tested; what is, is the logic underneath them, which is written as pure functions in `web/src/workout.ts` so it needs neither a browser nor a rendered component.

| Test | What it pins down |
|---|---|
| `workout.test.ts` | The id stamped from the start time so a retried send lands on the same workout, picking an exercise twice returning to it instead of duplicating it (a superset), sets logged and undone on the current exercise only, the weight cleared on a set logged without one, what the next set suggests (the previous one, the unit already in use, never a set without weight), the steppers and the keypad sharing one set of limits, and the elapsed clock |
| `workouts.test.ts` | How a saved workout reads: minutes rounded, hours split out past the hour, and the summary line naming the gym, the length and the exercises, singular included |
| `router.test.ts` | That every route survives a round trip through its path, that a new exercise's typed name rides in the history entry and a reload without it still opens the screen, and that an unknown path goes home rather than nowhere |
| `sendQueue.test.ts` | What the send queue does with each answer: an empty queue when everything goes through, stopping at the first workout it cannot reach the API with so the order survives, another go after a `401` or a `429`, and a `4xx` marked as refused for good without holding up the ones behind it |
| `catalog.test.ts` | That the app builds slugs exactly as the API does, using the cases from `SlugsTest` including `Straße` and Cyrillic, and the catalog search: matching anywhere in the name, names starting with what was typed coming first, accents and spacing ignored, the category filter, and recognizing an exercise the catalog already holds |

Two more commands run over the whole app:

```bash
cd web && npm run lint      # oxlint
cd web && npm run typecheck # tsc --noEmit, also part of npm run build
```

`oxlint` needs no configuration beyond [`.oxlintrc.json`](../web/.oxlintrc.json) and no TypeScript plugin, which is why it is here instead of ESLint: `typescript-eslint` still asks for TypeScript below 6.1, and this app is on 7.

Storage is not unit tested. `web/src/activeWorkout.ts` only reads and writes one IndexedDB key through `idb-keyval`, and it swallows every error on purpose: a browser with storage blocked costs the workout in progress, not the app.

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

The same tests run against the deployed API with the `Dev` environment. Every request needs a Cognito token, which the collection sends as `Authorization: Bearer {{authToken}}`.

The logins of the two dev users live in `.env.dev` at the repository root, which git ignores. That is a shortcut accepted for throwaway dev users only, and never for a real account:
```bash
ETIYA_DEV_USERNAME=you@example.com
ETIYA_DEV_PASSWORD='<PASSWORD>'
ETIYA_DEV2_USERNAME=you+second@example.com
ETIYA_DEV2_PASSWORD='<PASSWORD>'
```

The second user exists only to prove that one user cannot reach another's workouts. It never registers anything, so it stays empty run after run.

Both tokens are requested on the spot and passed on the command line, so neither is ever written to a file:
```bash
source .env.dev
token_for() {
  aws cognito-idp initiate-auth --auth-flow USER_PASSWORD_AUTH \
    --client-id <CLIENT_ID> \
    --auth-parameters USERNAME="$1",PASSWORD="$2" \
    --query 'AuthenticationResult.AccessToken' --output text
}
TOKEN=$(token_for "$ETIYA_DEV_USERNAME" "$ETIYA_DEV_PASSWORD")
OTHER_TOKEN=$(token_for "$ETIYA_DEV2_USERNAME" "$ETIYA_DEV2_PASSWORD")

cd bruno-tests && bru run --env Dev \
  --env-var authToken="$TOKEN" --env-var otherAuthToken="$OTHER_TOKEN" \
  --exclude-tags local-only
```

Tokens last one hour; when one expires, request another. If the password is lost, set a new one with `aws cognito-idp admin-set-user-password ... --permanent`; it needs uppercase, lowercase, a digit and a symbol.

The `Dev` environment is **not versioned**, since the API URL and the user belong to whoever deployed the stack. Create yours from the example and fill in the values `cdk deploy` printed:
```bash
cp bruno-tests/environments/Dev.example.bru bruno-tests/environments/Dev.bru
```
Note that `userId` there is the Cognito `sub`, not `user-default` as in the local environment.

To repeat the full suite against AWS, delete the catalog items from the previous run first, or the registration tests get `409`. The suite registers one gym and three exercises:
```bash
for sk in GYM#golds-gym-sunset-st-los-angeles EXERCISE#barbell-bench-press \
          EXERCISE#overhead-barbell-press EXERCISE#farmers-walk-basico; do
  aws dynamodb delete-item --table-name <TABLE_NAME> \
    --key "{\"PK\":{\"S\":\"${sk%%#*}\"},\"SK\":{\"S\":\"$sk\"}}"
done
```

The workouts the suite registers stay in the dev user's history, since the API cannot delete them yet.

## The `local-only` tag

Two tests are tagged `local-only` and excluded when running against AWS: the ones that expect `401` without a user. On AWS, API Gateway rejects those before any code runs, and the collection always sends a token.

## Two users, two identities

The two tests that prove one user cannot reach another's workouts run **in both environments**, because a second identity can be expressed in a way each understands. They send an `X-User-Id` header *and* their own `Authorization`, overriding the collection's:

* **Locally** the bridge fakes the Cognito `sub` from `X-User-Id` and never looks at the token, so the empty `otherAuthToken` is ignored.
* **On AWS** the token is the identity and `X-User-Id` is inert, exactly as it already is for every other request in the suite.

This matters more than it looks. Until the second user existed, the only evidence that a user's workouts are private came from the local bridge, where identity is a header anyone could set. On AWS it comes from a Cognito token, which is the mechanism that actually protects the data, and that path had never been exercised.

## In CI

[GitHub Actions](../.github/workflows/ci.yml) runs on every pull request and push to `main`, with the tools from the flake's `ci` shell:

| Job | Checks |
|---|---|
| API tests | Starts the Docker Compose stack and runs the suite with `--env Local` |
| Build | Spotless formatting, the unit tests while building the `prod` Lambda jar, and `cdk synth` with its security checks |
| Web | oxlint, the Vitest suite, the type check and the production build of the PWA |

The workflow has **no AWS credentials** and a read-only token, so it never deploys and never runs against the `Dev` environment. That keeps the repo safe to have public: pull requests from forks run the exact same checks with nothing to steal.

Every job must pass to merge into `main`, including on the pull requests **Dependabot** opens: once a week it proposes dependency updates for Maven, npm, GitHub Actions and the Docker images (see [its configuration](../.github/dependabot.yml)). `flake.lock` is not covered, so the toolchain is updated by hand with `nix flake update`, which the CI then tests in the same pull request. **CodeQL** scans the Java code on every pull request as well.

## What the integration suite covers

Registration and retrieval for the three domains, prefix search, filtering by muscle group, slug normalization, pagination with cursors, and the error paths: validation, malformed JSON, unknown IDs, duplicates (`409`), retried workouts (`200` with the stored one), sets without weight, values outside the fixed lists, unauthenticated requests, invalid `limit`, forged cursors, and one user being unable to list or open another's workouts.

That is 40 requests locally and 38 against AWS, the difference being the two `local-only` tests.
