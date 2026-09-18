package licaza.etiya.core.repository.dynamo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import licaza.etiya.core.exception.InputValidationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class WorkoutCursorsTest {

  @Test
  void decodesWhatItEncodes() {
    String sortKey = "WORKOUT#01K1H3ZC8R0000000000000000";

    assertThat(WorkoutCursors.decode(WorkoutCursors.encode(sortKey))).isEqualTo(sortKey);
  }

  // The cursor travels in a query string, so it must not need escaping
  @ParameterizedTest
  @ValueSource(strings = {"WORKOUT#01K1H3ZC8R0000000000000000", "WORKOUT#ab", "WORKOUT#a?b>"})
  void isUrlSafe(String sortKey) {
    assertThat(WorkoutCursors.encode(sortKey)).matches("[A-Za-z0-9_-]+");
  }

  @ParameterizedTest
  @ValueSource(strings = {"not a cursor!", "%%%", ""})
  void rejectsTextThatIsNotBase64(String cursor) {
    assertRejected(cursor);
  }

  // Well formed, but not something the API issues: only workout sort keys are accepted
  @ParameterizedTest
  @ValueSource(strings = {"GYM#golds-gym", "USER#someone-else", "workout#lowercase"})
  void rejectsKeysOtherThanWorkouts(String sortKey) {
    assertRejected(WorkoutCursors.encode(sortKey));
  }

  private static void assertRejected(String cursor) {
    assertThatThrownBy(() -> WorkoutCursors.decode(cursor))
        .isInstanceOf(InputValidationException.class)
        .hasMessageContaining("cursor is not valid");
  }
}
