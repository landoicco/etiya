package licaza.etiya.core.api;

import java.util.Map;
import java.util.function.Function;
import licaza.etiya.core.exception.InputValidationException;
import licaza.etiya.core.model.Page;
import licaza.etiya.core.model.Workout;
import licaza.etiya.core.service.WorkoutService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class WorkoutRoutes implements ApiRoutes {

  private final WorkoutService service;
  private final RequestBodyReader bodyReader;
  private final Map<String, Function<ApiRequest, ApiResponse>> routes;

  public WorkoutRoutes(WorkoutService service, RequestBodyReader bodyReader) {
    this.service = service;
    this.bodyReader = bodyReader;
    this.routes =
        Map.of(
            "POST /me/workouts", this::registerWorkout,
            "GET /me/workouts", this::getMyWorkouts,
            "GET /me/workouts/{workoutId}", this::getMyWorkout);
  }

  @Override
  public Map<String, Function<ApiRequest, ApiResponse>> routes() {
    return routes;
  }

  private ApiResponse registerWorkout(ApiRequest request) {
    // Authentication is checked before reading the body, so anonymous callers always get a 401
    String userId = request.requireUserId();
    Workout workoutInput = bodyReader.read(request, Workout.class);

    int exerciseCount =
        (workoutInput.getExercises() != null) ? workoutInput.getExercises().size() : 0;
    log.info(
        "📥 Incoming request to register workout at Gym ID: '{}' with {} exercises.",
        workoutInput.getGymId(),
        exerciseCount);

    Workout savedWorkout = service.registerWorkout(userId, workoutInput);

    log.info(
        "🏋️‍♂️ Workout successfully registered and persisted with ID: {}", savedWorkout.getId());

    return ApiResponse.created(savedWorkout);
  }

  private ApiResponse getMyWorkouts(ApiRequest request) {
    String userId = request.requireUserId();
    Integer limit = request.queryParameter("limit").map(this::parseLimit).orElse(null);
    String cursor = request.queryParameter("cursor").orElse(null);

    log.info("📥 Incoming request to fetch workouts for user: '{}'", userId);

    Page<Workout> page = service.getWorkoutsByUserId(userId, limit, cursor);

    log.info("✨ Successfully retrieved {} workouts from DynamoDB.", page.items().size());

    return ApiResponse.ok(page);
  }

  private ApiResponse getMyWorkout(ApiRequest request) {
    String userId = request.requireUserId();
    String workoutId = request.pathParameter("workoutId");

    log.info("📥 Incoming request to fetch workout '{}' for user: '{}'", workoutId, userId);

    return ApiResponse.ok(service.getWorkout(userId, workoutId));
  }

  private int parseLimit(String value) {
    try {
      return Integer.parseInt(value);
    } catch (NumberFormatException ex) {
      throw new InputValidationException("❌ Validation Error: limit must be a number");
    }
  }
}
