package licaza.etiya.core.api;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import licaza.etiya.core.model.Gym;
import licaza.etiya.core.model.Page;
import licaza.etiya.core.service.GymService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class GymRoutes implements ApiRoutes {

  private final GymService service;
  private final RequestBodyReader bodyReader;
  private final Map<String, Function<ApiRequest, ApiResponse>> routes;

  public GymRoutes(GymService service, RequestBodyReader bodyReader) {
    this.service = service;
    this.bodyReader = bodyReader;
    this.routes =
        Map.of(
            "POST /gyms", this::registerGym,
            "GET /gyms", this::searchGyms,
            "GET /gyms/{gymId}", this::getGym);
  }

  @Override
  public Map<String, Function<ApiRequest, ApiResponse>> routes() {
    return routes;
  }

  private ApiResponse registerGym(ApiRequest request) {
    Gym gymInput = bodyReader.read(request, Gym.class);

    log.info("📥 Request received to register a new gym: '{}'", gymInput.getName());

    Gym savedGym = service.registerGym(gymInput);

    log.info("🏢 Gym successfully processed and saved with ID: {}", savedGym.getId());

    return ApiResponse.created(savedGym);
  }

  private ApiResponse searchGyms(ApiRequest request) {
    String query = request.queryParameter("q").orElse(null);

    log.info("📥 Request received to search gyms with query: '{}'", query);

    List<Gym> results = service.searchGyms(query);

    log.info("✨ Search completed. Found {} gyms.", results.size());

    return ApiResponse.ok(Page.of(results));
  }

  private ApiResponse getGym(ApiRequest request) {
    String gymId = request.pathParameter("gymId");

    log.info("📥 Request received to fetch gym: '{}'", gymId);

    return ApiResponse.ok(service.getGym(gymId));
  }
}
