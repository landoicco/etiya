# Local Development

## Running the app

Docker Compose runs DynamoDB Local (in memory) next to the Spring application. Spring and Maven profiles keep local-only configuration and dependencies out of the production build.

Start the environment (this builds the app with the `local` Maven profile, which adds Spring Web):
```bash
docker compose up --build
```
The API is then available at `http://localhost:8080/`.

To stop the containers and wipe the temporary in-memory database:
```bash
docker compose down -v
```

## How identity works locally

On AWS the user comes from the Cognito `sub` claim that API Gateway validates. There is no API Gateway locally, so a bridge in `core/src/local/java` builds the same payload 2.0 events and takes the user from the `X-User-Id` header:

```bash
curl -H "X-User-Id: user-default" http://localhost:8080/me/workouts
```

The bridge matches the request against the same route table the Lambdas use, so local and AWS run the same handler code. It lives in a separate source folder that only the `local` Maven profile compiles, so it can never reach the Lambda jar.

## Nix Flake

The whole toolchain is defined in `flake.nix`. With Nix installed there is no need to set up Java, Maven or any CLI by hand:

```bash
nix develop
```
*This loads OpenJDK 21, Maven, AWS CLI, AWS CDK CLI, Node.js, Docker, the Bruno CLI (`bru`) and the Claude CLI.*

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

## Building

```bash
cd core
mvn -P local package        # fat jar for Docker, includes Spring Web
mvn -P prod package         # flat jar for Lambda (target/core-<version>-aws.jar)
mvn spotless:apply          # format to the Google Java style the project uses
```

Why two jars: Lambda cannot load Spring Boot's nested `BOOT-INF` layout, so the `prod` profile skips `repackage` and uses the shade plugin to produce a flat jar with `Main-Class` set. See [decisions](decisions.md).
