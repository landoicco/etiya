package licaza.etiya.core.api;

import static licaza.etiya.core.repository.ExerciseCatalogItemRepository.SHARED_CATALOG;

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

  // The Cognito group created in infra's Auth; the two names must match
  private static final String CATALOG_EDITORS = "admins";

  private final ExerciseService service;
  private final RequestBodyReader bodyReader;
  private final Map<String, Function<ApiRequest, ApiResponse>> routes;

  public ExerciseRoutes(ExerciseService service, RequestBodyReader bodyReader) {
    this.service = service;
    this.bodyReader = bodyReader;
    this.routes =
        Map.of(
            "POST /catalog/exercises", this::registerSharedExercise,
            "POST /exercises", this::registerExercise,
            "GET /exercises", this::searchExercises,
            "GET /exercises/{exerciseId}", this::getExercise);
  }

  @Override
  public Map<String, Function<ApiRequest, ApiResponse>> routes() {
    return routes;
  }

  private ApiResponse registerExercise(ApiRequest request) {
    String userId = request.requireUserId();
    ExerciseCatalogItem exerciseInput = bodyReader.read(request, ExerciseCatalogItem.class);

    log.info("📥 Request received to add exercise: '{}'", exerciseInput.getName());

    ExerciseCatalogItem savedItem = service.registerExercise(userId, exerciseInput);

    log.info("🏋️‍♂️ Exercise successfully stored for its owner! ID: {}", savedItem.getId());

    return ApiResponse.created(savedItem);
  }

  // Where an exercise goes is chosen by the route, not by who asks: an admin using the app still
  // adds private exercises, and only this route, which the app never calls, writes to the shared
  // catalog
  private ApiResponse registerSharedExercise(ApiRequest request) {
    request.requireGroup(CATALOG_EDITORS);
    ExerciseCatalogItem exerciseInput = bodyReader.read(request, ExerciseCatalogItem.class);

    log.info("📥 Request received to add to the shared catalog: '{}'", exerciseInput.getName());

    ExerciseCatalogItem savedItem = service.registerExercise(SHARED_CATALOG, exerciseInput);

    log.info("📚 Exercise stored in the shared catalog! ID: {}", savedItem.getId());

    return ApiResponse.created(savedItem);
  }

  private ApiResponse searchExercises(ApiRequest request) {
    String userId = request.requireUserId();
    String query = request.queryParameter("q").orElse(null);
    String muscleGroup = request.queryParameter("muscleGroup").orElse(null);

    log.info(
        "📥 Incoming search request for exercises with query: '{}' and muscle group: '{}'",
        query,
        muscleGroup);

    List<ExerciseCatalogItem> results = service.searchExercises(userId, query, muscleGroup);

    log.info("✨ Exercise search completed. Found {}", results.size());

    return ApiResponse.ok(Page.of(results));
  }

  private ApiResponse getExercise(ApiRequest request) {
    String userId = request.requireUserId();
    String exerciseId = request.pathParameter("exerciseId");

    log.info("📥 Request received to fetch exercise: '{}'", exerciseId);

    return ApiResponse.ok(service.getExercise(userId, exerciseId));
  }
}
