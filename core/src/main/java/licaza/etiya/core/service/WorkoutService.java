package licaza.etiya.core.service;

import java.util.List;
import java.util.UUID;
import licaza.etiya.core.model.Exercise;
import licaza.etiya.core.model.Workout;
import licaza.etiya.core.repository.ExerciseCatalogItemRepository;
import licaza.etiya.core.repository.GymRepository;
import licaza.etiya.core.repository.WorkoutRepository;
import licaza.etiya.core.service.validation.InputValidationService;
import org.springframework.stereotype.Service;

@Service
public class WorkoutService {

  private final InputValidationService validatorService;
  private final GymRepository gymRepository;
  private final ExerciseCatalogItemRepository exerciseCatalogRepository;
  private final WorkoutRepository workoutRepository;

  public WorkoutService(
      InputValidationService validatorService,
      GymRepository gymRepository,
      ExerciseCatalogItemRepository exerciseCatalogRepository,
      WorkoutRepository workoutRepository) {
    this.validatorService = validatorService;
    this.gymRepository = gymRepository;
    this.exerciseCatalogRepository = exerciseCatalogRepository;
    this.workoutRepository = workoutRepository;
  }

  public Workout registerWorkout(Workout input) {
    validatorService.validate(input);

    validateBusinessRules(input);

    // Generate unique ID
    if (input.getId() == null || input.getId().isEmpty()) {
      input.setId("wkt-" + UUID.randomUUID().toString());
    }

    workoutRepository.save(input);
    return input;
  }

  public List<Workout> getAllWorkouts() {
    return workoutRepository.findAll();
  }

  // Validate Gym and Exercise data is consistent
  private void validateBusinessRules(Workout input) {
    // if (true) return; // Disable on development

    // Verify Gym is on catalog
    if (input.getGymId() != null && !input.getGymId().trim().isEmpty()) {
      boolean existGym = gymRepository.findById(input.getGymId()).isPresent();
      if (!existGym) {
        throw new IllegalArgumentException(
            "❌ Error: The gym with ID '" + input.getGymId() + "' does not exist.");
      }
    }

    // Verify exercise is on master catalog
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
  }
}
