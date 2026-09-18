package licaza.etiya.core.repository.dynamo;

import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.WORKOUT_SK_PREFIX;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import licaza.etiya.core.exception.InputValidationException;

// Pagination cursors for workouts. A cursor only carries the sort key of the last item returned;
// the partition key is always rebuilt from the caller, so a crafted cursor cannot reach another
// user's workouts
final class WorkoutCursors {

  private WorkoutCursors() {}

  // URL-safe and unpadded, so the cursor can go in a query string as is
  static String encode(String sortKey) {
    return Base64.getUrlEncoder()
        .withoutPadding()
        .encodeToString(sortKey.getBytes(StandardCharsets.UTF_8));
  }

  // Returns the sort key, or rejects anything the API could not have issued
  static String decode(String cursor) {
    try {
      String sortKey = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
      if (sortKey.startsWith(WORKOUT_SK_PREFIX)) {
        return sortKey;
      }
    } catch (IllegalArgumentException ignored) {
      // Falls through to the validation error below
    }
    throw new InputValidationException("❌ Validation Error: The cursor is not valid");
  }
}
