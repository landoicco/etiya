package licaza.etiya.core.functions;

import java.util.List;
import java.util.UUID;
import java.util.function.Function;
import java.util.function.Supplier;
import licaza.etiya.core.model.Workout;
import licaza.etiya.core.repository.WorkoutRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class WorkoutFunctions {

  private final WorkoutRepository workoutRepository;

  public WorkoutFunctions(WorkoutRepository workoutRepository) {
    this.workoutRepository = workoutRepository;
  }

  @Bean
  public Function<Workout, Workout> registerWorkout() {
    return input -> {
      // Assign a unique ID
      if (input.getId() == null || input.getId().isEmpty()) {
        input.setId(UUID.randomUUID().toString());
      }

      workoutRepository.save(input);

      System.out.println("🏋️‍♂️ Workout registered! ID: " + input.getId());

      // Return
      return input;
    };
  }

  @Bean
  public Supplier<List<Workout>> getAllWorkouts() {
    return () -> {
      System.out.println("🔍 Quering all workouts on DynamoDB...");
      return workoutRepository.findAll();
    };
  }
}
