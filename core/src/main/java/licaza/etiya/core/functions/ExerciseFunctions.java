package licaza.etiya.core.functions;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import licaza.etiya.core.model.ExerciseCatalogItem;
import licaza.etiya.core.repository.ExerciseCatalogItemRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ExerciseFunctions {

  private final ExerciseCatalogItemRepository repository;
  private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

  public ExerciseFunctions(ExerciseCatalogItemRepository repository) {
    this.repository = repository;
  }

  @Bean
  public Function<ExerciseCatalogItem, ExerciseCatalogItem> registerExerciseOnCatalog() {
    return input -> {
      Set<ConstraintViolation<ExerciseCatalogItem>> violations = validator.validate(input);
      if (!violations.isEmpty()) {
        String errorMsg =
            violations.stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.joining(", "));
        throw new IllegalArgumentException("❌ Validation Error: " + errorMsg);
      }

      if (input.getId() == null || input.getId().trim().isEmpty()) {
        input.setId(input.getName().toLowerCase().replaceAll("\\s+", "-"));
      }

      repository.save(input);
      System.out.println("🏋️‍♂️ Exercise stored on our master catalog! ID: " + input.getId());
      return input;
    };
  }

  @Bean
  public Function<String, List<ExerciseCatalogItem>> searchExerciseOnCatalog() {
    return query -> repository.searchByName(query);
  }
}
