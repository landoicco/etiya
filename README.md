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


## 🛠️ Local Development Environment (Nix Flake)

This project unifies its entire development stack using a **Nix Flake**. If you are running NixOS or have the Nix package manager installed, there is no need to manually configure Java, Maven, or test clients.

To activate the environment with all tools ready to use, run in the root directory:
```bash
nix develop
```
*This will automatically load OpenJDK 21, Maven, AWS CLI, Docker, and the Bruno CLI (`bru`).*

---
## 📋 Data Architecture (Single Table Design)

To maximize performance and guarantee that the application remains 100% free on AWS, **Gyms** and **Workouts** are stored inside the **same single table** using a prefix strategy on its primary key (`id`):

* `gym-<slug>`: Records corresponding to the global catalog of gym venues.
* `wkt-<uuid>`: Workout session records, which optionally include denormalized `gymId` and `gymName` fields to eliminate expensive runtime queries (*JOINs*).

---

## 🔬 Automated Integration Tests (Bruno CLI)

The project includes a comprehensive suite of automated, plain-text integration tests written for **Bruno**. There is no need for a heavy graphical interface to test the API; the Flake bundles the official CLI.

To execute the entire test suite in rapid succession (successful creations, listings, and Jakarta validation failure rejections), open another terminal and run:
```bash
cd bruno-tests && bru run --env Local
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

### Authentication locally
On AWS, the user comes from the Cognito `sub` claim validated by API Gateway. Locally, a bridge (`src/local/java`, never packaged for Lambda) builds the same API Gateway events and takes the user from the `X-User-Id` header:
```bash
curl -H "X-User-Id: user-default" http://localhost:8080/me/workouts
```
