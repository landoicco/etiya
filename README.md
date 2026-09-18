# Etiya - Gym Tracker

A serverless backend for tracking gym workouts, built with Java and **Spring Cloud Function**, deployed on AWS Lambda behind an **HTTP API**, and using **Single Table Design** in DynamoDB to stay inside the AWS free tier.

```
Client ──► HTTP API ──► 3 Lambdas ──► DynamoDB
            (Cognito    (gyms,        (single table)
             JWT auth)   exercises,
                         workouts)
```

Every route requires a Cognito token. Workouts are stored under their owner, so a user can only ever read their own.

## Quick start

With [Nix](https://nixos.org/) installed:
```bash
nix develop            # Java 21, Maven, Docker, Bruno, AWS + CDK CLIs
docker compose up --build
```
The API answers at `http://localhost:8080`. Locally the user comes from a header:
```bash
curl -H "X-User-Id: user-default" http://localhost:8080/me/workouts
```

Run the test suite in another terminal:
```bash
cd bruno-tests && bru run --env Local
```

## Documentation

| Guide | What's in it |
|---|---|
| [Local development](docs/local-development.md) | Docker Compose, the Nix shells, how identity works locally, building |
| [Deployment](docs/deployment.md) | CDK stack, bootstrap, first Cognito user, cost and abuse limits |
| [API reference](docs/api.md) | Endpoints, conventions, status codes |
| [Data model](docs/data-model.md) | Single table design, slugs, ULIDs, workout times |
| [Testing](docs/testing.md) | Bruno against local and AWS, the `local-only` tag |
| [Decisions](docs/decisions.md) | Why the project looks the way it does, and what is deliberately postponed |

## Layout

```
core/         the application (Spring Cloud Function, DynamoDB)
infra/        infrastructure as code (AWS CDK in Java)
bruno-tests/  integration tests (Bruno CLI)
flake.nix     the whole toolchain
```
