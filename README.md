# Etiya - Gym Tracker

A serverless-ready, high-efficiency backend for tracking gym workouts. Built with Java and **Spring Cloud Function**, and optimized for the AWS Free Tier using **Single Table Design** in DynamoDB.

---
## 🚀 How to deploy?

### Local Deployment

This project leverages Docker Compose to run DynamoDB Local (in-memory) alongside the Spring application. It incorporates Spring and Maven Profiles to strictly decouple local development configurations and testing dependencies from production-ready cloud code.

Start the environment (this builds the app with the `local` Maven profile to include Spring Web):
   ```bash
   docker compose up --build
   ```
   
   Your functions will be available at `http://localhost:8080/`.

To stop the containers and wipe the temporary in-memory database:
```bash
docker compose down -v
```

### AWS Deployment (CDK)

The `infra/` directory holds an independent Maven project that defines the infrastructure with the **AWS CDK in Java**: a DynamoDB table, a Cognito user pool, three Lambdas (one per domain, with **SnapStart**) and an **HTTP API** where every route is protected by a JWT authorizer.

The Lambda jar is built first, since CDK packages it as an asset:
```bash
cd core && mvn -P prod clean package -DskipTests
cd ../infra && cdk deploy
```

The deploy prints everything needed to use the API: `ApiUrl`, `UserPoolId`, `UserPoolClientId` and `TableName`.

Users cannot sign themselves up, so the first one is created by an administrator:
```bash
aws cognito-idp admin-create-user --user-pool-id <POOL_ID> \
  --username you@example.com --message-action SUPPRESS

aws cognito-idp admin-set-user-password --user-pool-id <POOL_ID> \
  --username you@example.com --password '<PASSWORD>' --permanent
```
`--permanent` matters: without it the user stays in `FORCE_CHANGE_PASSWORD` and login returns a challenge instead of tokens.

To tear everything down (the dev environment keeps no data on purpose):
```bash
cd infra && cdk destroy
```


## 🛠️ Local Development Environment (Nix Flake)

This project unifies its entire development stack using a **Nix Flake**. If you are running NixOS or have the Nix package manager installed, there is no need to manually configure Java, Maven, or test clients.

To activate the environment with all tools ready to use, run in the root directory:
```bash
nix develop
```
*This will automatically load OpenJDK 21, Maven, AWS CLI, AWS CDK CLI, Node.js, Docker, the Bruno CLI (`bru`) and the Claude CLI.*

### Picking a shell for the task at hand

Not every task needs every tool, so the flake exposes one shell per use case. Pick one with `nix develop .#<name>`; each prints the versions of what it loaded:

| Shell | Tools | Use it to |
|---|---|---|
| `default` | Everything | Anything, or when in doubt |
| `dev` | Java, Maven, Docker, Bruno, Claude | Write code, run it locally, run the test suite |
| `infra` | Java, Maven, CDK, Node.js, AWS CLI | `cdk synth`, `cdk deploy`, inspect AWS |
| `run` | Docker, Docker Compose | Only start the app: `docker compose up --build` |

```bash
nix develop .#dev     # daily development
nix develop .#infra   # deploying
```

Shells share the Nix store, so a tool is downloaded once no matter how many shells use it; switching between them after that is instant. The gain is a smaller first download and a clear record of which tool belongs to which task. For a one-off command, no shell is needed at all:
```bash
nix shell nixpkgs#awscli2 --command aws sts get-caller-identity
```

---
## 📋 Data Architecture (Single Table Design)

To maximize performance and guarantee that the application remains 100% free on AWS, **Gyms**, **Exercises** and **Workouts** are stored inside the **same single table**, keyed by a partition key (`PK`) and a sort key (`SK`). Every access pattern is a `GetItem` or a `Query`; the table is never scanned.

| Item | `PK` | `SK` | Access patterns |
|---|---|---|---|
| Gym | `GYM` | `GYM#<slug>` | Get by ID, prefix search by name, list catalog |
| Exercise | `EXERCISE` | `EXERCISE#<slug>` | Get by ID, prefix search by name, list catalog |
| Workout | `USER#<userId>` | `WORKOUT#<ulid>` | Get by ID, list a user's workouts newest first (paginated) |

* **Catalog IDs** are slugs without accents or symbols, which is what makes prefix search by name possible:
  * Exercises use the name (`Farmer's Walk (Básico)` → `farmers-walk-basico`).
  * Gyms use the chain name, the optional branch and the city (`Smart Fit` + `Valle Oriente` + `Monterrey` → `smart-fit-valle-oriente-monterrey`), so every branch of a chain is its own gym and searching `smart fit` finds all of them.
* **Workouts** live under their owner's partition, so a user can only ever read their own. They optionally include denormalized `gymId` and `gymName` fields to eliminate expensive runtime queries (*JOINs*).
* **Workout IDs** are [ULIDs](https://github.com/ulid/spec) generated from `startedAt`. Since a ULID starts with its timestamp, sorting by ID sorts by start time, so one key serves both "get by ID" and "list chronologically".
* **Workout times** (`startedAt`, `endedAt`) are received as ISO-8601 with a time zone and stored in UTC (`yyyy-MM-ddTHH:mm:ssZ`). Only completed workouts are stored: both are required, the end must be after the start, within 12 hours and not in the future.

---

## 🔬 Automated Integration Tests (Bruno CLI)

The project includes a comprehensive suite of automated, plain-text integration tests written for **Bruno**. There is no need for a heavy graphical interface to test the API; the Flake bundles the official CLI.

To execute the entire test suite in rapid succession (successful creations, listings, and Jakarta validation failure rejections), open another terminal and run:
```bash
cd bruno-tests && bru run --env Local
```

> **Run the suite against a fresh database.** Gyms and exercises can't be created twice (the API answers `409 Conflict`), so a second run over the same data fails on the registration tests. DynamoDB Local runs in memory, so restarting the stack wipes it:
> ```bash
> docker compose down -v && docker compose up --build
> ```

### Running the suite against AWS

The same tests run against the deployed API with the `Dev` environment. Every request there needs a Cognito token, which the collection sends as `Authorization: Bearer {{authToken}}`. The token is passed on the command line, so it is never written to a file:

```bash
TOKEN=$(aws cognito-idp initiate-auth --auth-flow USER_PASSWORD_AUTH \
  --client-id <CLIENT_ID> \
  --auth-parameters USERNAME=you@example.com,PASSWORD='<PASSWORD>' \
  --query 'AuthenticationResult.AccessToken' --output text)

cd bruno-tests && bru run --env Dev --env-var authToken="$TOKEN" --exclude-tags local-only
```

Tokens last one hour; when one expires, request another.

Four tests are tagged `local-only` and excluded above, because they depend on how the local bridge fakes identity:
* Two expect `401` without a user. On AWS, API Gateway rejects those before any code runs.
* Two check that a user cannot see another user's workouts, using the `X-User-Id` header. On AWS the identity comes from the token, so verifying this would need a second Cognito user.

The `Dev` environment is not versioned, since the API URL and the user belong to whoever deployed the stack. Create yours from the example, filling in the values that `cdk deploy` printed:
```bash
cp bruno-tests/environments/Dev.example.bru bruno-tests/environments/Dev.bru
```
It stores the API URL and the `userId`, which on AWS is the Cognito `sub` rather than `user-default`. To repeat the full suite against AWS, the catalog items from the previous run have to be deleted first, or the registration tests get `409`:
```bash
aws dynamodb delete-item --table-name <TABLE_NAME> \
  --key '{"PK":{"S":"GYM"},"SK":{"S":"GYM#golds-gym-sunset-st-los-angeles"}}'
```

### Available Endpoints:
Lists always return `{ "items": [...], "nextCursor": null }`, and errors share the `ErrorResponse` format with real HTTP status codes.

* **Gyms** (`gymsApi` Lambda):
  * `POST /gyms` - Registers a gym in the catalog (Validates fields via Jakarta).
  * `GET /gyms?q=golds` - Prefix search by name; without `q` it lists the whole catalog.
  * `GET /gyms/{gymId}` - Returns one gym.
* **Exercises** (`exercisesApi` Lambda):
  * `POST /exercises` - Registers an exercise in the master catalog.
  * `GET /exercises?q=bench&muscleGroup=chest` - Search by name prefix and/or muscle group (both optional).
  * `GET /exercises/{exerciseId}` - Returns one exercise.
* **Workouts** (`workoutsApi` Lambda, authenticated):
  * `POST /me/workouts` - Saves a workout for the caller, with cascade validation (Gym linking is optional).
  * `GET /me/workouts?limit=20&cursor=...` - The caller's workouts, newest first, paginated.
  * `GET /me/workouts/{workoutId}` - Returns one of the caller's workouts (another user's workout returns 404).

### Authentication locally
On AWS, the user comes from the Cognito `sub` claim validated by API Gateway. Locally, a bridge (`src/local/java`, never packaged for Lambda) builds the same API Gateway events and takes the user from the `X-User-Id` header:
```bash
curl -H "X-User-Id: user-default" http://localhost:8080/me/workouts
```
