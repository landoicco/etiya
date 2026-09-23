package licaza.etiya.core.api;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import licaza.etiya.core.exception.InputValidationException;
import licaza.etiya.core.model.ExerciseCatalogItem;
import licaza.etiya.core.model.Workout;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class RequestBodyReaderTest {

  private final RequestBodyReader reader = new RequestBodyReader(JsonMapper.builder().build());

  @Test
  void namesTheFieldAndTheAcceptedValuesOfAFixedList() {
    String body = "{\"name\":\"Press de banca\",\"muscleGroup\":\"Pecho\",\"category\":\"PUSH\"}";

    assertThatThrownBy(() -> reader.read(request(body), ExerciseCatalogItem.class))
        .isInstanceOf(InputValidationException.class)
        .hasMessageContaining("muscleGroup must be one of CHEST, BACK, SHOULDERS");
  }

  // Values are case sensitive, like every other enum in the API
  @Test
  void rejectsALowercaseValue() {
    String body = "{\"name\":\"Pull-ups\",\"muscleGroup\":\"BACK\",\"category\":\"pull\"}";

    assertThatThrownBy(() -> reader.read(request(body), ExerciseCatalogItem.class))
        .hasMessageContaining("category must be one of PUSH, PULL, LEGS, CORE, CARDIO, OTHER");
  }

  // The field is found however deep it is nested
  @Test
  void namesANestedField() {
    String body =
        "{\"exercises\":[{\"name\":\"Pull-ups\",\"sets\":[{\"count\":8,\"weight\":0,"
            + "\"unit\":\"REPS\"}]}]}";

    assertThatThrownBy(() -> reader.read(request(body), Workout.class))
        .hasMessageContaining("unit must be one of KG, LB, NONE");
  }

  @Test
  void keepsTheGenericMessageForMalformedJson() {
    assertThatThrownBy(() -> reader.read(request("{\"name\":"), ExerciseCatalogItem.class))
        .hasMessageContaining("not valid JSON for this route");
  }

  private static ApiRequest request(String body) {
    return new ApiRequest("POST /exercises", "/exercises", null, null, body, "user-123", null);
  }
}
