package licaza.etiya.core.service;

import java.util.List;
import licaza.etiya.core.model.ExerciseCatalogItem;
import licaza.etiya.core.repository.ExerciseCatalogItemRepository;
import licaza.etiya.core.service.validation.InputValidationService;
import org.springframework.stereotype.Service;

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
      input.setId(input.getName().toLowerCase().replaceAll("\\s+", "-"));
    }

    // Save on database
    repository.save(input);

    return input;
  }

  public List<ExerciseCatalogItem> searchByName(String query) {
    return repository.searchByName(query);
  }
}
