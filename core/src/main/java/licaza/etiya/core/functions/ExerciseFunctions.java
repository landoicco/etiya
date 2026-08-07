package licaza.etiya.core.functions;

import java.util.List;
import java.util.function.Function;
import licaza.etiya.core.exception.FunctionWrapper;
import licaza.etiya.core.model.ExerciseCatalogItem;
import licaza.etiya.core.service.ExerciseService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;

@Slf4j
@Configuration
public class ExerciseFunctions {

  private final ExerciseService service;

  public ExerciseFunctions(ExerciseService service) {
    this.service = service;
  }

  @Bean
  public Function<Message<ExerciseCatalogItem>, Message<?>> registerExerciseOnCatalog() {
    return FunctionWrapper.<ExerciseCatalogItem, Object>safe(
        input -> {
          ExerciseCatalogItem exerciseInput = input.getPayload();

          log.info("📥 Request received to catalog exercise: '{}'", exerciseInput.getName());

          ExerciseCatalogItem savedItem = service.registerExercise(exerciseInput);

          log.info(
              "🏋️‍♂️ Exercise successfully stored on master catalog! ID: {}", savedItem.getId());

          // Build message response
          return MessageBuilder.withPayload((Object) savedItem)
              .setHeader("statusCode", 201)
              .setHeader("Content-Type", "application/json")
              .build();
        });
  }

  @Bean
  public Function<Message<String>, Message<?>> searchExerciseOnCatalog() {
    return FunctionWrapper.<String, Object>safe(
        input -> {
          String query = input.getPayload();

          log.info("📥 Incoming search request for exercise with query: '{}'", query);

          List<ExerciseCatalogItem> results = service.searchByName(query);

          log.info("✨ Exercise search completed. Found {}", results.size());

          return MessageBuilder.withPayload((Object) results)
              .setHeader("statusCode", 200)
              .setHeader("Content-Type", "application/json")
              .build();
        });
  }
}
