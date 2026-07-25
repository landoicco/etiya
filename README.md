# Etiya - Gym Tracker

A serverless-ready, high-efficiency backend for tracking gym workouts. Built with Java and **Spring Cloud Function**, and optimized for the AWS Free Tier using **Single Table Design** in DynamoDB.

---

## 🚀 Development Environment (Nix Flake)

This project unifies its entire development stack using a **Nix Flake**. If you are running NixOS or have the Nix package manager installed, there is no need to manually configure Java, Maven, or test clients.

To activate the environment with all tools ready to use, run in the root directory:
```bash
nix develop
```
*This will automatically load OpenJDK 21, Maven, AWS CLI, Docker, and the Bruno CLI (`bru`).*

---

## 🛠️ Local Setup & Execution

### 1. Start DynamoDB Local (Docker)
The database runs isolated inside a local container. Spin up the database by executing:
```bash
docker run -d -p 8000:8000 amazon/dynamodb-local
```

### 2. Run the Spring Boot Application
The project uses Spring Profiles to decouple development from production code. To start the local server pointing to your Docker container, run:
```bash
mvn spring-boot:run
```
*(The backend will boot on port `8080` and automatically create the unified table `GymAppTable` if it does not exist).*

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
