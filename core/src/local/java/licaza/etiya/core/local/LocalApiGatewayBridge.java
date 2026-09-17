package licaza.etiya.core.local;

import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent.RequestContext;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import licaza.etiya.core.api.ApiRoutes;
import licaza.etiya.core.aws.ApiGatewayAdapter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.server.PathContainer;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.pattern.PathPattern;
import org.springframework.web.util.pattern.PathPatternParser;

// Local stand-in for API Gateway: matches the request against the declared routes, builds the
// same payload 2.0 event AWS would send, and fakes the Cognito "sub" claim from X-User-Id
@Slf4j
@Profile("local")
@RestController
public class LocalApiGatewayBridge {

  private static final String USER_ID_HEADER = "X-User-Id";

  private final ApiGatewayAdapter adapter;
  private final List<RouteBinding> bindings;

  private record RouteBinding(String method, PathPattern pattern, String routeKey, ApiRoutes api) {}

  public LocalApiGatewayBridge(ApiGatewayAdapter adapter, List<ApiRoutes> apis) {
    this.adapter = adapter;
    this.bindings =
        apis.stream()
            .flatMap(
                api ->
                    api.routes().keySet().stream()
                        .map(
                            routeKey -> {
                              String[] parts = routeKey.split(" ", 2);
                              return new RouteBinding(
                                  parts[0],
                                  PathPatternParser.defaultInstance.parse(parts[1]),
                                  routeKey,
                                  api);
                            }))
            // Literal paths win over templated ones, as they do in API Gateway
            .sorted(Comparator.comparing(RouteBinding::pattern, PathPattern.SPECIFICITY_COMPARATOR))
            .toList();

    bindings.forEach(b -> log.info("🌉 [Local API Gateway] Route registered: {}", b.routeKey()));
  }

  @RequestMapping("/**")
  public ResponseEntity<String> proxy(
      HttpServletRequest request, @RequestBody(required = false) String body) {
    PathContainer path = PathContainer.parsePath(request.getRequestURI());

    for (RouteBinding binding : bindings) {
      if (!binding.method().equalsIgnoreCase(request.getMethod())) {
        continue;
      }
      PathPattern.PathMatchInfo match = binding.pattern().matchAndExtract(path);
      if (match != null) {
        APIGatewayV2HTTPEvent event =
            toEvent(request, body, binding.routeKey(), match.getUriVariables());
        APIGatewayV2HTTPResponse response = adapter.handle(binding.api(), event);

        return ResponseEntity.status(response.getStatusCode())
            .headers(headers -> response.getHeaders().forEach(headers::add))
            .body(response.getBody());
      }
    }

    // Same answer API Gateway gives for an undeclared route
    return ResponseEntity.status(404)
        .contentType(MediaType.APPLICATION_JSON)
        .body("{\"message\":\"Not Found\"}");
  }

  private APIGatewayV2HTTPEvent toEvent(
      HttpServletRequest request,
      String body,
      String routeKey,
      Map<String, String> pathParameters) {
    // API Gateway lowercases header names and joins repeated query parameters with commas
    Map<String, String> headers = new HashMap<>();
    Collections.list(request.getHeaderNames())
        .forEach(name -> headers.put(name.toLowerCase(), request.getHeader(name)));

    Map<String, String> queryParameters = new HashMap<>();
    request
        .getParameterMap()
        .forEach((name, values) -> queryParameters.put(name, String.join(",", values)));

    RequestContext.RequestContextBuilder context =
        RequestContext.builder()
            .withRouteKey(routeKey)
            .withStage("$default")
            .withHttp(
                RequestContext.Http.builder()
                    .withMethod(request.getMethod())
                    .withPath(request.getRequestURI())
                    .build());

    String userId = request.getHeader(USER_ID_HEADER);
    if (userId != null && !userId.isBlank()) {
      context.withAuthorizer(
          RequestContext.Authorizer.builder()
              .withJwt(
                  RequestContext.Authorizer.JWT.builder().withClaims(Map.of("sub", userId)).build())
              .build());
    }

    return APIGatewayV2HTTPEvent.builder()
        .withVersion("2.0")
        .withRouteKey(routeKey)
        .withRawPath(request.getRequestURI())
        .withRawQueryString(request.getQueryString())
        .withHeaders(headers)
        .withQueryStringParameters(queryParameters.isEmpty() ? null : queryParameters)
        .withPathParameters(pathParameters.isEmpty() ? null : pathParameters)
        .withBody(body)
        .withIsBase64Encoded(false)
        .withRequestContext(context.build())
        .build();
  }
}
