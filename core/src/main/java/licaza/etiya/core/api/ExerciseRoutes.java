package licaza.etiya.core.api;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import licaza.etiya.core.model.ExerciseCatalogItem;
import licaza.etiya.core.model.Page;
import licaza.etiya.core.service.ExerciseService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class ExerciseRoutes implements ApiRoutes {

  private final ExerciseService service;
  private final RequestBodyReader bodyReader;
  private final Map<String, Function<ApiRequest, ApiResponse>> routes;

  public ExerciseRoutes(ExerciseService service, RequestBodyReader bodyReader) {
    this.service = service;
    this.bodyReader = bodyReader;
    this.routes =
        Map.of(
            "POST /exercises", this::registerExercise,
            "GET /exercises", this::searchExercises,
            "GET /exercises/{exerciseId}", this::getExercise);
  }

  @Override
  public Map<String, Function<ApiRequest, ApiResponse>> routes() {
    return routes;
  }

  private ApiResponse registerExercise(ApiRequest request) {
    ExerciseCatalogItem exerciseInput = bodyReader.read(request, ExerciseCatalogItem.class);

    log.info("📥 Request received to catalog exercise: '{}'", exerciseInput.getName());

    ExerciseCatalogItem savedItem = service.registerExercise(exerciseInput);

    log.info("🏋️‍♂️ Exercise successfully stored on master catalog! ID: {}", savedItem.getId());

    return ApiResponse.created(savedItem);
  }

  private ApiResponse searchExercises(ApiRequest request) {
    String query = request.queryParameter("q").orElse(null);
    String muscleGroup = request.queryParameter("muscleGroup").orElse(null);

    log.info(
        "📥 Incoming search request for exercises with query: '{}' and muscle group: '{}'",
        query,
        muscleGroup);

    List<ExerciseCatalogItem> results = service.searchExercises(query, muscleGroup);

    log.info("✨ Exercise search completed. Found {}", results.size());

    return ApiResponse.ok(Page.of(results));
  }

  private ApiResponse getExercise(ApiRequest request) {
    String exerciseId = request.pathParameter("exerciseId");

    log.info("📥 Request received to fetch exercise: '{}'", exerciseId);

    return ApiResponse.ok(service.getExercise(exerciseId));
  }
}
