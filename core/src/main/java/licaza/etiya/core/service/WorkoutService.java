package licaza.etiya.core.service;

import com.github.f4b6a3.ulid.Ulid;
import com.github.f4b6a3.ulid.UlidCreator;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import licaza.etiya.core.exception.GymNotFoundException;
import licaza.etiya.core.exception.InputValidationException;
import licaza.etiya.core.exception.WorkoutNotFoundException;
import licaza.etiya.core.model.Exercise;
import licaza.etiya.core.model.Page;
import licaza.etiya.core.model.Workout;
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
  private final ExerciseService exerciseService;
  private final WorkoutRepository workoutRepository;

  public WorkoutService(
      InputValidationService validatorService,
      GymRepository gymRepository,
      ExerciseService exerciseService,
      WorkoutRepository workoutRepository) {
    this.validatorService = validatorService;
    this.gymRepository = gymRepository;
    this.exerciseService = exerciseService;
    this.workoutRepository = workoutRepository;
  }

  // created is false when the workout was already stored: a retry of a request whose response
  // never reached the client. The stored workout is returned, and nothing is written again
  public record Registration(Workout workout, boolean created) {}

  public Registration registerWorkout(String userId, Workout input) {
    // The owner always comes from the authenticated caller, never from the request body
    input.setUserId(userId);

    validatorService.validate(input);

    Instant startedAt = normalizeTimes(input);

    validateBusinessRules(input);

    input.setId(workoutId(input.getId(), startedAt));

    if (workoutRepository.create(input)) {
      return new Registration(input, true);
    }

    log.info("🔁 Workout '{}' was already registered; returning the stored one", input.getId());
    Workout stored =
        workoutRepository
            .findById(userId, input.getId())
            .orElseThrow(
                () ->
                    new IllegalStateException(
                        "Workout '" + input.getId() + "' exists but could not be read"));
    return new Registration(stored, false);
  }

  // The ID is a ULID whose time part is startedAt, so sorting IDs sorts by start time.
  // A client that retries sends its own ULID, so every attempt maps to the same item. Only its
  // random part is kept: the time part always comes from startedAt, whatever the client's clock
  private String workoutId(String clientId, Instant startedAt) {
    if (clientId == null) {
      return UlidCreator.getUlid(startedAt.toEpochMilli()).toString();
    }
    if (!Ulid.isValid(clientId)) {
      throw new InputValidationException(
          "❌ Validation Error: id must be a ULID, e.g. 01KZ8BHKC0N761RDSJY0HMX246");
    }
    return new Ulid(startedAt.toEpochMilli(), Ulid.from(clientId).getRandom()).toString();
  }

  public Workout getWorkout(String userId, String workoutId) {
    log.info("🗄️ Fetching workout '{}' for user '{}'...", workoutId, userId);

    // A workout owned by someone else is reported as missing, so IDs of other users can't be probed
    return workoutRepository
        .findById(userId, workoutId)
        .orElseThrow(
            () ->
                new WorkoutNotFoundException(
                    "❌ Error: The workout with ID '" + workoutId + "' does not exist."));
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

  // Stored in UTC with a fixed width, so the stored strings order like the instants.
  // Returns the normalized startedAt
  private Instant normalizeTimes(Workout input) {
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
    return startedAt;
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

    // Verify each exercise is one the owner can see: shared, or added by them
    if (input.getExercises() != null) {
      for (Exercise exe : input.getExercises()) {
        if (exe.getExerciseCatalogItemId() != null
            && !exe.getExerciseCatalogItemId().trim().isEmpty()) {
          exerciseService.getExercise(input.getUserId(), exe.getExerciseCatalogItemId());
        }
      }
    }
  }
}
