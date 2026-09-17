package licaza.etiya.core.service;

import java.util.UUID;
import licaza.etiya.core.exception.ExerciseCatalogItemNotFoundException;
import licaza.etiya.core.exception.GymNotFoundException;
import licaza.etiya.core.exception.InputValidationException;
import licaza.etiya.core.model.Exercise;
import licaza.etiya.core.model.Page;
import licaza.etiya.core.model.Workout;
import licaza.etiya.core.repository.ExerciseCatalogItemRepository;
import licaza.etiya.core.repository.GymRepository;
import licaza.etiya.core.repository.WorkoutRepository;
import licaza.etiya.core.service.validation.InputValidationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class WorkoutService {

  private static final int DEFAULT_PAGE_SIZE = 20;
  private static final int MAX_PAGE_SIZE = 100;

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

  public Workout registerWorkout(String userId, Workout input) {
    // The owner always comes from the authenticated caller, never from the request body
    input.setUserId(userId);

    validatorService.validate(input);

    validateBusinessRules(input);

    // Generate unique ID
    if (input.getId() == null || input.getId().isEmpty()) {
      input.setId("wkt-" + UUID.randomUUID().toString());
      log.debug("🆔 Generated new unique UUID for workout: {}", input.getId());
    }

    workoutRepository.save(input);
    return input;
  }

  // limit is optional and defaults to DEFAULT_PAGE_SIZE
  public Page<Workout> getWorkoutsByUserId(String userId, Integer limit, String cursor) {
    int pageSize = (limit == null) ? DEFAULT_PAGE_SIZE : limit;
    if (pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
      throw new InputValidationException(
          "❌ Validation Error: limit must be between 1 and " + MAX_PAGE_SIZE);
    }

    log.info("🗄️ Fetching up to {} workout records for user '{}'...", pageSize, userId);
    return workoutRepository.findByUserId(userId, pageSize, cursor);
  }

  // Validate Gym and Exercise data is consistent
  private void validateBusinessRules(Workout input) {
    // if (true) { // Disable validations during development
    //   log.warn("⚠️ WARNING: Business rule validations are TEMPORARILY DISABLED for workouts!
    // ⚠️");
    //   return;
    // }

    // Verify Gym is on catalog
    if (input.getGymId() != null && !input.getGymId().trim().isEmpty()) {
      boolean existGym = gymRepository.findById(input.getGymId()).isPresent();
      if (!existGym) {
        log.error("❌ Gym validation failed. ID '{}' does not exist in catalog.", input.getGymId());
        throw new GymNotFoundException(
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
            log.error(
                "❌ Exercise validation failed. Catalog Item ID '{}' not found.",
                exe.getExerciseCatalogItemId());
            throw new ExerciseCatalogItemNotFoundException(
                "❌ Error: The exercise with ID '"
                    + exe.getExerciseCatalogItemId()
                    + "' does not exist in the master catalog.");
          }
        }
      }
    }
  }
}
