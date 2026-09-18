package licaza.etiya.core.api;

import java.util.Map;
import java.util.Optional;
import licaza.etiya.core.exception.UnauthorizedException;

// Cloud-neutral view of an HTTP request, so routes never depend on a provider's event types
public record ApiRequest(
    String routeKey,
    String path,
    Map<String, String> pathParameters,
    Map<String, String> queryParameters,
    String body,
    String userId) {

  public ApiRequest {
    pathParameters = pathParameters == null ? Map.of() : pathParameters;
    queryParameters = queryParameters == null ? Map.of() : queryParameters;
  }

  public String pathParameter(String name) {
    return pathParameters.get(name);
  }

  // Blank values are treated as missing
  public Optional<String> queryParameter(String name) {
    return Optional.ofNullable(queryParameters.get(name))
        .map(String::trim)
        .filter(value -> !value.isEmpty());
  }

  public String requireUserId() {
    if (userId == null || userId.isBlank()) {
      throw new UnauthorizedException("❌ Error: The request is not authenticated");
    }
    return userId;
  }
}
