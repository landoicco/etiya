package licaza.etiya.core.service;

import java.util.List;
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
      String generatedId = input.getName().toLowerCase().replaceAll("\\s+", "-");
      input.setId(generatedId);
      log.debug("🆔 Generated new slug ID for exercise catalog: {}", generatedId);
    }

    // Save on database
    repository.save(input);

    return input;
  }

  public List<ExerciseCatalogItem> searchByName(String query) {
    log.info("🔍 Querying database for exercises matching name: '{}'", query);
    return repository.searchByName(query);
  }
}
