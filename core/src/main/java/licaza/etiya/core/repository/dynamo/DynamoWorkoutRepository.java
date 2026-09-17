package licaza.etiya.core.repository.dynamo;

import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.PK;
import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.SK;
import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.USER_PK_PREFIX;
import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.WORKOUT_SK_PREFIX;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import licaza.etiya.core.exception.InputValidationException;
import licaza.etiya.core.model.Page;
import licaza.etiya.core.model.Workout;
import licaza.etiya.core.repository.WorkoutRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

@Repository
public class DynamoWorkoutRepository implements WorkoutRepository {

  private final DynamoDbTable<Workout> table;

  public DynamoWorkoutRepository(
      @Qualifier("dynamoDbEnhancedClient") DynamoDbEnhancedClient enhancedClient,
      @Value("${etiya.dynamodb.table-name}") String tableName) {
    this.table = enhancedClient.table(tableName, TableSchemaFactory.createWorkoutSchema());
  }

  // Newest first: the sort key starts with the workout's dateTime.
  // The cursor only carries the sort key and the partition key is rebuilt from userId,
  // so a crafted cursor can never read another user's workouts
  @Override
  public Page<Workout> findByUserId(String userId, int limit, String cursor) {
    String partitionKey = USER_PK_PREFIX + userId;
    Key key = Key.builder().partitionValue(partitionKey).sortValue(WORKOUT_SK_PREFIX).build();

    QueryEnhancedRequest.Builder request =
        QueryEnhancedRequest.builder()
            .queryConditional(QueryConditional.sortBeginsWith(key))
            .scanIndexForward(false)
            .limit(limit);

    if (cursor != null) {
      request.exclusiveStartKey(
          Map.of(
              PK, AttributeValue.fromS(partitionKey),
              SK, AttributeValue.fromS(decodeCursor(cursor))));
    }

    software.amazon.awssdk.enhanced.dynamodb.model.Page<Workout> page =
        table.query(request.build()).iterator().next();

    // Dynamo may return a last key even when no items are left; the next page is then just empty
    Map<String, AttributeValue> lastKey = page.lastEvaluatedKey();
    String nextCursor =
        (lastKey == null || lastKey.isEmpty()) ? null : encodeCursor(lastKey.get(SK).s());

    return new Page<>(page.items(), nextCursor);
  }

  @Override
  public void save(Workout workout) {
    table.putItem(workout);
  }

  private static String encodeCursor(String sortKey) {
    return Base64.getUrlEncoder()
        .withoutPadding()
        .encodeToString(sortKey.getBytes(StandardCharsets.UTF_8));
  }

  private static String decodeCursor(String cursor) {
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
