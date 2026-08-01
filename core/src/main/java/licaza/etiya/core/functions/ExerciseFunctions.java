package licaza.etiya.core.functions;

import java.util.List;
import java.util.function.Function;
import licaza.etiya.core.model.ExerciseCatalogItem;
import licaza.etiya.core.service.ExerciseService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class ExerciseFunctions {

  private final ExerciseService service;

  public ExerciseFunctions(ExerciseService service) {
    this.service = service;
  }

  @Bean
  public Function<ExerciseCatalogItem, ExerciseCatalogItem> registerExerciseOnCatalog() {
    return input -> {
      log.info("📥 Request received to catalog exercise: '{}'", input.getName());

      ExerciseCatalogItem savedItem = service.registerExercise(input);

      log.info("🏋️‍♂️ Exercise successfully stored on master catalog! ID: {}", savedItem.getId());
      return savedItem;
    };
  }

  @Bean
  public Function<String, List<ExerciseCatalogItem>> searchExerciseOnCatalog() {
    return query -> {
      log.info("📥 Incoming search request for exercise with query: '{}'", query);

      List<ExerciseCatalogItem> results = service.searchByName(query);

      log.info("✨ Exercise search completed. Found {}", results.size());
      return results;
    };
  }
}
