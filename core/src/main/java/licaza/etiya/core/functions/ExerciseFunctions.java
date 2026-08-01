package licaza.etiya.core.functions;

import java.util.List;
import java.util.function.Function;
import licaza.etiya.core.model.ExerciseCatalogItem;
import licaza.etiya.core.service.ExerciseService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ExerciseFunctions {

  private final ExerciseService service;

  public ExerciseFunctions(ExerciseService service) {
    this.service = service;
  }

  @Bean
  public Function<ExerciseCatalogItem, ExerciseCatalogItem> registerExerciseOnCatalog() {
    return input -> {
      ExerciseCatalogItem savedItem = service.registerExercise(input);

      System.out.println("🏋️‍♂️ Exercise stored on our master catalog! ID: " + savedItem.getId());
      return savedItem;
    };
  }

  @Bean
  public Function<String, List<ExerciseCatalogItem>> searchExerciseOnCatalog() {
    return query -> service.searchByName(query);
  }
}
