# --- Step 1: Compile ---
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .

# We use 'local' Maven Profile
RUN mvn dependency:go-offline -P local -B
COPY src ./src
RUN mvn clean package -P local -DskipTests

# --- Step 2: Execute ---
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
