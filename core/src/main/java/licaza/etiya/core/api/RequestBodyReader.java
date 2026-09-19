package licaza.etiya.core.api;

import java.util.Arrays;
import java.util.stream.Collectors;
import licaza.etiya.core.exception.InputValidationException;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.exc.InvalidFormatException;
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
    } catch (InvalidFormatException ex) {
      throw invalidValue(ex);
    } catch (JacksonException ex) {
      throw new InputValidationException(
          "❌ Validation Error: The request body is not valid JSON for this route");
    }
  }

  // A value outside a fixed list, like "Pecho" as a muscle group, says which values are accepted
  private InputValidationException invalidValue(InvalidFormatException ex) {
    Class<?> target = ex.getTargetType();
    if (target == null || !target.isEnum()) {
      return new InputValidationException(
          "❌ Validation Error: The request body is not valid JSON for this route");
    }

    String accepted =
        Arrays.stream(target.getEnumConstants())
            .map(Object::toString)
            .collect(Collectors.joining(", "));
    return new InputValidationException(
        "❌ Validation Error: " + fieldName(ex) + " must be one of " + accepted);
  }

  // The innermost property, e.g. "unit" for exercises[0].sets[1].unit
  private String fieldName(InvalidFormatException ex) {
    return ex.getPath().reversed().stream()
        .map(JacksonException.Reference::getPropertyName)
        .filter(name -> name != null)
        .findFirst()
        .orElse("A value");
  }
}
