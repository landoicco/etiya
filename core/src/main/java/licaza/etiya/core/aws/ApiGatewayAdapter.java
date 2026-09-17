package licaza.etiya.core.aws;

import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPResponse;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;
import licaza.etiya.core.api.ApiDispatcher;
import licaza.etiya.core.api.ApiRequest;
import licaza.etiya.core.api.ApiResponse;
import licaza.etiya.core.api.ApiRoutes;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

// Translates HTTP API (payload format 2.0) events to and from the cloud-neutral API types.
// AWS types must not travel past this class
@Component
public class ApiGatewayAdapter {

  private final ApiDispatcher dispatcher;
  private final JsonMapper jsonMapper;

  public ApiGatewayAdapter(ApiDispatcher dispatcher, JsonMapper jsonMapper) {
    this.dispatcher = dispatcher;
    this.jsonMapper = jsonMapper;
  }

  public APIGatewayV2HTTPResponse handle(ApiRoutes api, APIGatewayV2HTTPEvent event) {
    ApiResponse response = dispatcher.dispatch(api, toApiRequest(event));

    return APIGatewayV2HTTPResponse.builder()
        .withStatusCode(response.statusCode())
        .withHeaders(Map.of("Content-Type", "application/json"))
        .withBody(jsonMapper.writeValueAsString(response.body()))
        .build();
  }

  private ApiRequest toApiRequest(APIGatewayV2HTTPEvent event) {
    String body = event.getBody();
    if (body != null && event.getIsBase64Encoded()) {
      body = new String(Base64.getDecoder().decode(body), StandardCharsets.UTF_8);
    }

    return new ApiRequest(
        event.getRouteKey(),
        event.getRawPath(),
        event.getPathParameters(),
        event.getQueryStringParameters(),
        body,
        userIdFrom(event));
  }

  // The JWT authorizer has already validated the token; Cognito's unique user ID is the "sub" claim
  private String userIdFrom(APIGatewayV2HTTPEvent event) {
    return Optional.ofNullable(event.getRequestContext())
        .map(APIGatewayV2HTTPEvent.RequestContext::getAuthorizer)
        .map(APIGatewayV2HTTPEvent.RequestContext.Authorizer::getJwt)
        .map(APIGatewayV2HTTPEvent.RequestContext.Authorizer.JWT::getClaims)
        .map(claims -> claims.get("sub"))
        .orElse(null);
  }
}
