package licaza.etiya.core.functions;

import java.util.List;
import java.util.function.Function;
import java.util.function.Supplier;
import licaza.etiya.core.model.Workout;
import licaza.etiya.core.service.WorkoutService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class WorkoutFunctions {
  private final WorkoutService service;

  public WorkoutFunctions(WorkoutService service) {
    this.service = service;
  }

  @Bean
  public Function<Workout, Workout> registerWorkout(WorkoutService workoutService) {
    return input -> {
      Workout savedWorkout = workoutService.registerWorkout(input);
      System.out.println("🏋️‍♂️ Workout saved successfully! ID: " + savedWorkout.getId());
      return savedWorkout;
    };
  }

  @Bean
  public Supplier<List<Workout>> getAllWorkouts(WorkoutService workoutService) {
    return () -> {
      System.out.println("🔍 Querying all workouts on DynamoDB...");
      return workoutService.getAllWorkouts();
    };
  }
}
