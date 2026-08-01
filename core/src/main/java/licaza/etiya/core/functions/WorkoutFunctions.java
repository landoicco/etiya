package licaza.etiya.core.functions;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Collectors;
import licaza.etiya.core.model.Exercise;
import licaza.etiya.core.model.Workout;
import licaza.etiya.core.repository.*;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class WorkoutFunctions {

  private final ExerciseCatalogItemRepository exerciseCatalogRepository;
  private final WorkoutRepository workoutRepository;
  private final GymRepository gymRepository;
  private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

  public WorkoutFunctions(
      WorkoutRepository workoutRepository,
      GymRepository gymRepository,
      ExerciseCatalogItemRepository exerciseCatalogRepository) {
    this.workoutRepository = workoutRepository;
    this.gymRepository = gymRepository;
    this.exerciseCatalogRepository = exerciseCatalogRepository;
  }

  @Bean
  public Function<Workout, Workout> registerWorkout() {
    return input -> {
      // Jakarta validation, validate annotations (@NotBlank, @NotEmpty, etc.)
      Set<ConstraintViolation<Workout>> violations = validator.validate(input);
      if (!violations.isEmpty()) {
        String errorMsg =
            violations.stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.joining(", "));
        throw new IllegalArgumentException("❌ Validation Error: " + errorMsg);
      }

      // Verify gym is in our catalog
      if (input.getGymId() != null && !input.getGymId().trim().isEmpty()) {
        boolean existGym = gymRepository.findById(input.getGymId()).isPresent();
        if (!existGym) {
          throw new IllegalArgumentException(
              "❌ Error: The gym with ID '" + input.getGymId() + "' does not exist.");
        }
      }

      // Verify exercise is in catalog
      if (input.getExercises() != null) {
        for (Exercise exe : input.getExercises()) {
          if (exe.getExerciseCatalogItemId() != null
              && !exe.getExerciseCatalogItemId().trim().isEmpty()) {
            boolean existExercise =
                exerciseCatalogRepository.findById(exe.getExerciseCatalogItemId()).isPresent();
            if (!existExercise) {
              throw new IllegalArgumentException(
                  "❌ Error: The exercise with ID '"
                      + exe.getExerciseCatalogItemId()
                      + "' does not exist in the master catalog.");
            }
          }
        }
      }

      if (input.getId() == null || input.getId().isEmpty()) {
        input.setId("wkt-" + UUID.randomUUID().toString());
      }

      workoutRepository.save(input);
      System.out.println("🏋️‍♂️ Workout saved successfully! ID: " + input.getId());
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
