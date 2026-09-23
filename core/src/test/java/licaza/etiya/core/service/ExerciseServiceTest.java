package licaza.etiya.core.service;

import static licaza.etiya.core.repository.ExerciseCatalogItemRepository.SHARED_CATALOG;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.validation.Validation;
import java.util.List;
import java.util.Optional;
import licaza.etiya.core.exception.AlreadyExistsException;
import licaza.etiya.core.exception.ExerciseCatalogItemNotFoundException;
import licaza.etiya.core.model.ExerciseCatalogItem;
import licaza.etiya.core.model.ExerciseCategory;
import licaza.etiya.core.model.MuscleGroup;
import licaza.etiya.core.repository.ExerciseCatalogItemRepository;
import licaza.etiya.core.service.validation.InputValidationService;
import org.junit.jupiter.api.Test;

// The real Jakarta validator runs; only the repository is mocked
class ExerciseServiceTest {

  private static final String USER_ID = "user-123";

  private final ExerciseCatalogItemRepository repository =
      mock(ExerciseCatalogItemRepository.class);

  private final ExerciseService service =
      new ExerciseService(
          new InputValidationService(Validation.buildDefaultValidatorFactory().getValidator()),
          repository);

  // --- Adding ---

  @Test
  void whatAUserAddsIsTheirs() {
    when(repository.create(any())).thenReturn(true);

    ExerciseCatalogItem saved = service.registerExercise(USER_ID, input("Costureras"));

    assertThat(saved.getId()).isEqualTo("costureras");
    verify(repository)
        .create(argThat(e -> USER_ID.equals(e.getOwnerId()) && "costureras".equals(e.getId())));
  }

  @Test
  void ownerComesFromTheCallerNotTheBody() {
    when(repository.create(any())).thenReturn(true);
    ExerciseCatalogItem input = input("Costureras");
    input.setOwnerId("someone-else");

    service.registerExercise(USER_ID, input);

    verify(repository).create(argThat(e -> USER_ID.equals(e.getOwnerId())));
  }

  // Nobody gets a private copy of a shared exercise
  @Test
  void refusesANameTheSharedCatalogHas() {
    when(repository.findById(SHARED_CATALOG, "lat-pulldown"))
        .thenReturn(Optional.of(item("lat-pulldown")));

    assertThatThrownBy(() -> service.registerExercise(USER_ID, input("Lat Pulldown")))
        .isInstanceOf(AlreadyExistsException.class);
    verify(repository, never()).create(any());
  }

  @Test
  void refusesANameTheUserAlreadyAdded() {
    when(repository.create(any())).thenReturn(false);

    assertThatThrownBy(() -> service.registerExercise(USER_ID, input("Costureras")))
        .isInstanceOf(AlreadyExistsException.class);
  }

  // --- Listing ---

  @Test
  void aUserSeesTheSharedCatalogAndTheirOwn() {
    when(repository.findAll(SHARED_CATALOG)).thenReturn(List.of(item("a"), item("c")));
    when(repository.findAll(USER_ID)).thenReturn(List.of(item("b")));

    assertThat(service.searchExercises(USER_ID, null, null))
        .extracting(ExerciseCatalogItem::getId)
        .containsExactly("a", "b", "c");
  }

  @Test
  void theSharedOneWinsWhenBothHaveAnId() {
    ExerciseCatalogItem shared = item("lat-pulldown");
    ExerciseCatalogItem own = item("lat-pulldown");
    own.setOwnerId(USER_ID);
    when(repository.findAll(SHARED_CATALOG)).thenReturn(List.of(shared));
    when(repository.findAll(USER_ID)).thenReturn(List.of(own));

    assertThat(service.searchExercises(USER_ID, null, null)).containsExactly(shared);
  }

  @Test
  void aSearchLooksInBoth() {
    when(repository.findBySlugPrefix(SHARED_CATALOG, "lat"))
        .thenReturn(List.of(item("lat-pulldown")));
    when(repository.findBySlugPrefix(USER_ID, "lat")).thenReturn(List.of(item("lat-raise")));

    assertThat(service.searchExercises(USER_ID, "Lat", null))
        .extracting(ExerciseCatalogItem::getId)
        .containsExactly("lat-pulldown", "lat-raise");
  }

  // --- Fetching one ---

  @Test
  void findsAnExerciseTheUserAdded() {
    ExerciseCatalogItem own = item("costureras");
    when(repository.findById(USER_ID, "costureras")).thenReturn(Optional.of(own));

    assertThat(service.getExercise(USER_ID, "costureras")).isSameAs(own);
  }

  // Only the shared catalog and the caller's own are looked at, so it reads as missing
  @Test
  void anExerciseSomeoneElseAddedIsMissing() {
    when(repository.findById("someone-else", "costureras"))
        .thenReturn(Optional.of(item("costureras")));

    assertThatThrownBy(() -> service.getExercise(USER_ID, "costureras"))
        .isInstanceOf(ExerciseCatalogItemNotFoundException.class);
  }

  private static ExerciseCatalogItem input(String name) {
    return new ExerciseCatalogItem(null, name, MuscleGroup.BACK, ExerciseCategory.PULL);
  }

  private static ExerciseCatalogItem item(String id) {
    return new ExerciseCatalogItem(id, id, MuscleGroup.BACK, ExerciseCategory.PULL);
  }
}
