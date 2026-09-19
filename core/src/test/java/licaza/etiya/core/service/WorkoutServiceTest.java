package licaza.etiya.core.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.github.f4b6a3.ulid.Ulid;
import com.github.f4b6a3.ulid.UlidCreator;
import jakarta.validation.Validation;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import licaza.etiya.core.exception.ExerciseCatalogItemNotFoundException;
import licaza.etiya.core.exception.GymNotFoundException;
import licaza.etiya.core.exception.InputValidationException;
import licaza.etiya.core.model.Exercise;
import licaza.etiya.core.model.GymSet;
import licaza.etiya.core.model.WeightUnit;
import licaza.etiya.core.model.Workout;
import licaza.etiya.core.repository.ExerciseCatalogItemRepository;
import licaza.etiya.core.repository.GymRepository;
import licaza.etiya.core.repository.WorkoutRepository;
import licaza.etiya.core.service.validation.InputValidationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

// The real Jakarta validator runs; only the repositories are mocked
class WorkoutServiceTest {

  private static final String USER_ID = "user-123";

  private final GymRepository gymRepository = mock(GymRepository.class);
  private final ExerciseCatalogItemRepository exerciseRepository =
      mock(ExerciseCatalogItemRepository.class);
  private final WorkoutRepository workoutRepository = mock(WorkoutRepository.class);

  private final WorkoutService service =
      new WorkoutService(
          new InputValidationService(Validation.buildDefaultValidatorFactory().getValidator()),
          gymRepository,
          exerciseRepository,
          workoutRepository);

  // Every write succeeds unless a test says otherwise
  @BeforeEach
  void newWorkoutsAreWritten() {
    when(workoutRepository.create(any())).thenReturn(true);
  }

  // --- Times ---

  @Test
  void storesTimesInUtc() {
    Workout saved = register(workout("2026-07-31T18:30:00-06:00", "2026-07-31T19:45:00-06:00"));

    // 18:30 in Monterrey is already the next day in UTC
    assertThat(saved.getStartedAt()).isEqualTo("2026-08-01T00:30:00Z");
    assertThat(saved.getEndedAt()).isEqualTo("2026-08-01T01:45:00Z");
  }

  @Test
  void dropsFractionsOfASecond() {
    Workout saved = register(workout("2026-07-31T18:30:00.987Z", "2026-07-31T19:00:00.5Z"));

    assertThat(saved.getStartedAt()).isEqualTo("2026-07-31T18:30:00Z");
    assertThat(saved.getEndedAt()).isEqualTo("2026-07-31T19:00:00Z");
  }

  @Test
  void rejectsTimesWithoutTimeZone() {
    assertRejected(
        workout("2026-07-31T18:30:00", "2026-07-31T19:30:00Z"), "startedAt must be an ISO-8601");
  }

  @ParameterizedTest
  @ValueSource(strings = {"2026-07-31T18:30:00Z", "2026-07-31T18:00:00Z"})
  void rejectsEndNotAfterStart(String endedAt) {
    assertRejected(workout("2026-07-31T18:30:00Z", endedAt), "endedAt must be after startedAt");
  }

  @Test
  void acceptsExactlyTwelveHours() {
    Workout saved = register(workout("2026-07-31T06:00:00Z", "2026-07-31T18:00:00Z"));

    assertThat(saved.getEndedAt()).isEqualTo("2026-07-31T18:00:00Z");
  }

  @Test
  void rejectsMoreThanTwelveHours() {
    assertRejected(
        workout("2026-07-31T06:00:00Z", "2026-07-31T18:00:01Z"), "cannot last more than 12 hours");
  }

  // Wide margins around the 5 minute tolerance, since the service reads the real clock
  @Test
  void rejectsEndInTheFuture() {
    Instant now = Instant.now();

    assertRejected(
        workout(now.toString(), now.plus(Duration.ofHours(1)).toString()),
        "endedAt cannot be in the future");
  }

  @Test
  void acceptsWorkoutThatJustEnded() {
    Instant now = Instant.now();

    register(workout(now.minus(Duration.ofHours(1)).toString(), now.minusSeconds(60).toString()));
  }

  // --- IDs ---

  @Test
  void idEncodesTheStartTime() {
    Workout saved = register(workout("2026-07-31T18:30:00-06:00", "2026-07-31T19:45:00-06:00"));

    assertThat(Ulid.from(saved.getId()).getInstant())
        .isEqualTo(Instant.parse("2026-08-01T00:30:00Z"));
  }

  // What lets the history be listed newest first with no index: IDs sort by start time,
  // regardless of the order in which workouts were registered
  @Test
  void idsSortByStartTimeNotByRegistrationOrder() {
    Workout later = register(workout("2026-07-31T18:00:00Z", "2026-07-31T19:00:00Z"));
    Workout earlier = register(workout("2026-07-30T18:00:00Z", "2026-07-30T19:00:00Z"));

    assertThat(earlier.getId()).isLessThan(later.getId());
  }

  // --- Client IDs, for retries ---

  // The client's clock and the moment it generated the ID do not matter: the stored ID still
  // sorts by startedAt
  @Test
  void keepsTheRandomPartOfTheClientIdAndTakesTheTimeFromTheStart() {
    Ulid clientId = UlidCreator.getUlid(Instant.parse("2030-01-01T00:00:00Z").toEpochMilli());
    Workout input = workout("2026-07-31T18:30:00Z", "2026-07-31T19:30:00Z");
    input.setId(clientId.toString());

    Ulid stored = Ulid.from(register(input).getId());

    assertThat(stored.getRandom()).isEqualTo(clientId.getRandom());
    assertThat(stored.getInstant()).isEqualTo(Instant.parse("2026-07-31T18:30:00Z"));
  }

  // What makes a retry land on the same item instead of creating a second one
  @Test
  void sameClientIdAndStartGiveTheSameId() {
    String clientId = UlidCreator.getUlid().toString();

    Workout first = workout("2026-07-31T18:30:00Z", "2026-07-31T19:30:00Z");
    first.setId(clientId);
    Workout retry = workout("2026-07-31T12:30:00-06:00", "2026-07-31T13:30:00-06:00");
    retry.setId(clientId);

    assertThat(register(retry).getId()).isEqualTo(register(first).getId());
  }

  @Test
  void returnsTheStoredWorkoutOnRetry() {
    Workout stored = workout("2026-07-31T18:00:00Z", "2026-07-31T19:00:00Z");
    when(workoutRepository.create(any())).thenReturn(false);
    when(workoutRepository.findById(any(), any())).thenReturn(Optional.of(stored));

    Workout input = workout("2026-07-31T18:00:00Z", "2026-07-31T19:00:00Z");
    input.setId(UlidCreator.getUlid().toString());
    WorkoutService.Registration registration = service.registerWorkout(USER_ID, input);

    assertThat(registration.created()).isFalse();
    assertThat(registration.workout()).isSameAs(stored);
    verify(workoutRepository).findById(USER_ID, input.getId());
  }

  @Test
  void reportsANewWorkoutAsCreated() {
    Workout input = workout("2026-07-31T18:00:00Z", "2026-07-31T19:00:00Z");

    assertThat(service.registerWorkout(USER_ID, input).created()).isTrue();
  }

  @ParameterizedTest
  @ValueSource(strings = {"chosen-by-client", "", "01KZ8BHKC0N761RDSJY0HMX24"})
  void rejectsAnIdThatIsNotAUlid(String id) {
    Workout input = workout("2026-07-31T18:00:00Z", "2026-07-31T19:00:00Z");
    input.setId(id);

    assertRejected(input, "id must be a ULID");
  }

  // --- Ownership ---

  @Test
  void ownerComesFromTheCallerNotTheBody() {
    Workout input = workout("2026-07-31T18:00:00Z", "2026-07-31T19:00:00Z");
    input.setUserId("someone-else");

    service.registerWorkout(USER_ID, input);

    verify(workoutRepository).create(argThat(saved -> USER_ID.equals(saved.getUserId())));
  }

  // --- Catalog references ---

  @Test
  void rejectsGymNotInCatalog() {
    Workout input = workout("2026-07-31T18:00:00Z", "2026-07-31T19:00:00Z");
    input.setGymId("unknown-gym");
    when(gymRepository.findById("unknown-gym")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.registerWorkout(USER_ID, input))
        .isInstanceOf(GymNotFoundException.class);
    verify(workoutRepository, never()).create(any());
  }

  @Test
  void skipsBlankGymId() {
    Workout input = workout("2026-07-31T18:00:00Z", "2026-07-31T19:00:00Z");
    input.setGymId("  ");

    register(input);

    verifyNoInteractions(gymRepository);
  }

  @Test
  void rejectsExerciseNotInCatalog() {
    Workout input = workout("2026-07-31T18:00:00Z", "2026-07-31T19:00:00Z");
    input.getExercises().getFirst().setExerciseCatalogItemId("unknown-exercise");
    when(exerciseRepository.findById("unknown-exercise")).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.registerWorkout(USER_ID, input))
        .isInstanceOf(ExerciseCatalogItemNotFoundException.class);
    verify(workoutRepository, never()).create(any());
  }

  // --- Pagination ---

  @Test
  void defaultsToTwentyItemsPerPage() {
    service.getWorkoutsByUserId(USER_ID, null, null);

    verify(workoutRepository).findByUserId(USER_ID, 20, null);
  }

  @ParameterizedTest
  @ValueSource(ints = {1, 100})
  void acceptsLimitsWithinRange(int limit) {
    service.getWorkoutsByUserId(USER_ID, limit, null);

    verify(workoutRepository).findByUserId(USER_ID, limit, null);
  }

  @ParameterizedTest
  @ValueSource(ints = {0, 101})
  void rejectsLimitsOutOfRange(int limit) {
    assertThatThrownBy(() -> service.getWorkoutsByUserId(USER_ID, limit, null))
        .isInstanceOf(InputValidationException.class)
        .hasMessageContaining("limit must be between 1 and 100");
    verifyNoInteractions(workoutRepository);
  }

  // --- Helpers ---

  // The smallest workout the validator accepts: one exercise with one set
  private static Workout workout(String startedAt, String endedAt) {
    Workout workout = new Workout();
    workout.setStartedAt(startedAt);
    workout.setEndedAt(endedAt);
    workout.setExercises(
        List.of(new Exercise(null, "Push-ups", List.of(new GymSet(10, 0, WeightUnit.KG)))));
    return workout;
  }

  private Workout register(Workout input) {
    return service.registerWorkout(USER_ID, input).workout();
  }

  private void assertRejected(Workout input, String message) {
    assertThatThrownBy(() -> service.registerWorkout(USER_ID, input))
        .isInstanceOf(InputValidationException.class)
        .hasMessageContaining(message);
    verify(workoutRepository, never()).create(any());
  }
}
