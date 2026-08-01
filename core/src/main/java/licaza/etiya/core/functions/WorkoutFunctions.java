package licaza.etiya.core.functions;

import java.util.List;
import java.util.function.Function;
import java.util.function.Supplier;
import licaza.etiya.core.model.Workout;
import licaza.etiya.core.service.WorkoutService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class WorkoutFunctions {
  private final WorkoutService service;

  public WorkoutFunctions(WorkoutService service) {
    this.service = service;
  }

  @Bean
  public Function<Workout, Workout> registerWorkout(WorkoutService service) {
    return input -> {
      // Count number of exercises in Workout
      int exerciseCount = (input.getExercises() != null) ? input.getExercises().size() : 0;
      log.info(
          "📥 Incoming request to register workout at Gym ID: '{}' with {} exercises.",
          input.getGymId(),
          exerciseCount);

      Workout savedWorkout = service.registerWorkout(input);

      log.info(
          "🏋️‍♂️ Workout successfully registered and persisted with ID: {}", savedWorkout.getId());
      return savedWorkout;
    };
  }

  @Bean
  public Supplier<List<Workout>> getAllWorkouts(WorkoutService workoutService) {
    return () -> {
      log.info("📥 Incoming request to fetch all workouts.");

      List<Workout> workouts = service.getAllWorkouts();

      log.info("✨ Successfully retrieved {} workouts from DynamoDB.", workouts.size());
      return workouts;
    };
  }
}
