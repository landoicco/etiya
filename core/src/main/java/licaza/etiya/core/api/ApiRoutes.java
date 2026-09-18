package licaza.etiya.core.api;

import java.util.Map;
import java.util.function.Function;

// A group of routes deployed together (one Lambda on AWS)
public interface ApiRoutes {

  // Keyed by "METHOD /path/{param}", the same format as API Gateway route keys
  Map<String, Function<ApiRequest, ApiResponse>> routes();
}
