package licaza.etiya.core.service;

import java.util.List;
import licaza.etiya.core.exception.ExerciseCatalogItemNotFoundException;
import licaza.etiya.core.exception.InputValidationException;
import licaza.etiya.core.model.ExerciseCatalogItem;
import licaza.etiya.core.repository.ExerciseCatalogItemRepository;
import licaza.etiya.core.service.validation.InputValidationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class ExerciseService {

  private final InputValidationService validatorService;
  private final ExerciseCatalogItemRepository repository;

  public ExerciseService(
      InputValidationService validatorService, ExerciseCatalogItemRepository repository) {
    this.validatorService = validatorService;
    this.repository = repository;
  }

  public ExerciseCatalogItem registerExercise(ExerciseCatalogItem input) {
    validatorService.validate(input);

    // Generate ID slug if empty
    if (input.getId() == null || input.getId().trim().isEmpty()) {
      String generatedId = Slugs.of(input.getName());
      if (generatedId.isEmpty()) {
        throw new InputValidationException(
            "❌ Validation Error: Exercise name must contain letters or numbers");
      }
      input.setId(generatedId);
      log.debug("🆔 Generated new slug ID for exercise catalog: {}", generatedId);
    }

    // Save on database
    repository.save(input);

    return input;
  }

  // Both filters are optional; the catalog is small, so the muscle group is filtered in memory
  public List<ExerciseCatalogItem> searchExercises(String query, String muscleGroup) {
    log.info(
        "🔍 Querying database for exercises matching name: '{}' and muscle group: '{}'",
        query,
        muscleGroup);

    String slugPrefix = (query == null) ? "" : Slugs.of(query);
    List<ExerciseCatalogItem> candidates =
        slugPrefix.isEmpty() ? repository.findAll() : repository.findBySlugPrefix(slugPrefix);

    if (muscleGroup == null || muscleGroup.isBlank()) {
      return candidates;
    }
    return candidates.stream()
        .filter(e -> muscleGroup.equalsIgnoreCase(e.getMuscleGroup()))
        .toList();
  }

  public ExerciseCatalogItem getExercise(String id) {
    return repository
        .findById(id)
        .orElseThrow(
            () ->
                new ExerciseCatalogItemNotFoundException(
                    "❌ Error: The exercise with ID '"
                        + id
                        + "' does not exist in the master catalog."));
  }
}
