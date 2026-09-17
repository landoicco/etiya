package licaza.etiya.core.api;

import java.time.LocalDateTime;
import java.util.function.Function;
import licaza.etiya.core.exception.BusinessException;
import licaza.etiya.core.exception.RouteNotFoundException;
import licaza.etiya.core.model.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class ApiDispatcher {

  public ApiResponse dispatch(ApiRoutes api, ApiRequest request) {
    try {
      Function<ApiRequest, ApiResponse> route = api.routes().get(request.routeKey());
      if (route == null) {
        throw new RouteNotFoundException(
            "❌ Error: The route '" + request.routeKey() + "' does not exist.");
      }
      return route.apply(request);
    } catch (Exception ex) {
      return toErrorResponse(ex, request);
    }
  }

  private ApiResponse toErrorResponse(Exception ex, ApiRequest request) {
    ErrorResponse errorBody;
    int httpStatus = 500;

    if (ex instanceof BusinessException busEx) {
      httpStatus = busEx.getStatusCode();
      errorBody =
          new ErrorResponse(
              LocalDateTime.now(),
              httpStatus,
              busEx.getCode(),
              busEx.getMessage(),
              request.path(),
              null);
    } else if (ex instanceof IllegalArgumentException) {
      httpStatus = 400;
      errorBody =
          new ErrorResponse(
              LocalDateTime.now(),
              httpStatus,
              "BAD_REQUEST",
              ex.getMessage(),
              request.path(),
              null);
    } else {
      log.error("❌ Unexpected error while handling '{}': ", request.routeKey(), ex);
      errorBody =
          new ErrorResponse(
              LocalDateTime.now(),
              httpStatus,
              "INTERNAL_SERVER_ERROR",
              "❌ Unexpected error on server.",
              request.path(),
              null);
    }

    return new ApiResponse(httpStatus, errorBody);
  }
}
