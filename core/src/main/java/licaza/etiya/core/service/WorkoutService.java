package licaza.etiya.core.service;

import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
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
  private static final Duration MAX_WORKOUT_DURATION = Duration.ofHours(12);
  private static final Duration CLOCK_SKEW_TOLERANCE = Duration.ofMinutes(5);
  private static final DateTimeFormatter UTC_SECONDS =
      DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'").withZone(ZoneOffset.UTC);

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

    normalizeTimes(input);

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

  // Stored in UTC with a fixed width, so sort keys built from startedAt order like the instants
  private void normalizeTimes(Workout input) {
    Instant startedAt = parseInstant("startedAt", input.getStartedAt());
    Instant endedAt = parseInstant("endedAt", input.getEndedAt());

    if (!endedAt.isAfter(startedAt)) {
      throw new InputValidationException("❌ Validation Error: endedAt must be after startedAt");
    }
    if (Duration.between(startedAt, endedAt).compareTo(MAX_WORKOUT_DURATION) > 0) {
      throw new InputValidationException(
          "❌ Validation Error: A workout cannot last more than "
              + MAX_WORKOUT_DURATION.toHours()
              + " hours");
    }
    // Small tolerance for clients whose clock runs slightly ahead
    if (endedAt.isAfter(Instant.now().plus(CLOCK_SKEW_TOLERANCE))) {
      throw new InputValidationException("❌ Validation Error: endedAt cannot be in the future");
    }

    input.setStartedAt(UTC_SECONDS.format(startedAt));
    input.setEndedAt(UTC_SECONDS.format(endedAt));
  }

  private Instant parseInstant(String field, String value) {
    try {
      return OffsetDateTime.parse(value).toInstant().truncatedTo(ChronoUnit.SECONDS);
    } catch (DateTimeParseException ex) {
      throw new InputValidationException(
          "❌ Validation Error: "
              + field
              + " must be an ISO-8601 date-time with a time zone, e.g. 2026-07-31T18:30:00-06:00");
    }
  }

  // Validate Gym and Exercise data is consistent
  private void validateBusinessRules(Workout input) {
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
