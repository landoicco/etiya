package licaza.etiya.core.api;

import licaza.etiya.core.exception.InputValidationException;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

@Component
public class RequestBodyReader {

  private final JsonMapper jsonMapper;

  public RequestBodyReader(JsonMapper jsonMapper) {
    this.jsonMapper = jsonMapper;
  }

  public <T> T read(ApiRequest request, Class<T> type) {
    if (request.body() == null || request.body().isBlank()) {
      throw new InputValidationException("❌ Validation Error: The request body cannot be empty");
    }

    try {
      return jsonMapper.readValue(request.body(), type);
    } catch (JacksonException ex) {
      throw new InputValidationException(
          "❌ Validation Error: The request body is not valid JSON for this route");
    }
  }
}
