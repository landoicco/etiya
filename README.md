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

To maximize performance and guarantee that the application remains 100% free on AWS, **Gyms** and **Workouts** are stored inside the **same single table** (`GymAppTable`) using a prefix strategy on its primary key (`id`):

* `gym-<slug>`: Records corresponding to the global catalog of gym venues.
* `wkt-<uuid>`: Workout session records, which optionally include denormalized `gymId` and `gymName` fields to eliminate expensive runtime queries (*JOINs*).

---

## 🔬 Automated Integration Tests (Bruno CLI)

The project includes a comprehensive suite of automated, plain-text integration tests written for **Bruno**. There is no need for a heavy graphical interface to test the API; the Flake bundles the official CLI.

To execute the entire test suite in rapid succession (successful creations, listings, and Jakarta validation failure rejections), open another terminal and run:
```bash
cd bruno-tests && bru run
```

### Available Endpoints:
* **Gym Catalog:**
  * `POST /registerGym` - Registers a gym in the catalog (Validates fields via Jakarta).
  * `POST /searchGyms` - Predictive prefix-based search engine (Mapped with efficient DynamoDB filter expressions).
* **Workouts:**
  * `POST /registerWorkout` - Saves a workout with cascade validation (Gym linking is optional).
  * `GET /getAllWorkouts` - Retrieves the full workout history log.
