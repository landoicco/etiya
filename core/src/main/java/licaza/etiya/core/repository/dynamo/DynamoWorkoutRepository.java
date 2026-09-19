package licaza.etiya.core.repository.dynamo;

import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.PK;
import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.SK;
import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.USER_PK_PREFIX;
import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.WORKOUT_SK_PREFIX;

import java.util.Map;
import java.util.Optional;
import licaza.etiya.core.model.Page;
import licaza.etiya.core.model.Workout;
import licaza.etiya.core.repository.WorkoutRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Expression;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.model.PutItemEnhancedRequest;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryEnhancedRequest;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException;

@Repository
public class DynamoWorkoutRepository implements WorkoutRepository {

  // Evaluated against the item with the same PK and SK, atomically, so a retry arriving while
  // the first request is still being written cannot create a second copy either
  private static final Expression WORKOUT_DOES_NOT_EXIST =
      Expression.builder()
          .expression("attribute_not_exists(#pk)")
          .putExpressionName("#pk", PK)
          .build();

  private final DynamoDbTable<Workout> table;

  public DynamoWorkoutRepository(
      @Qualifier("dynamoDbEnhancedClient") DynamoDbEnhancedClient enhancedClient,
      @Value("${etiya.dynamodb.table-name}") String tableName) {
    this.table = enhancedClient.table(tableName, TableSchemaFactory.createWorkoutSchema());
  }

  // Newest first: the sort key is the workout's ULID, which starts with its startedAt.
  // The partition key always comes from userId, never from the cursor (see WorkoutCursors)
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
              SK, AttributeValue.fromS(WorkoutCursors.decode(cursor))));
    }

    software.amazon.awssdk.enhanced.dynamodb.model.Page<Workout> page =
        table.query(request.build()).iterator().next();

    // Dynamo may return a last key even when no items are left; the next page is then just empty
    Map<String, AttributeValue> lastKey = page.lastEvaluatedKey();
    String nextCursor =
        (lastKey == null || lastKey.isEmpty()) ? null : WorkoutCursors.encode(lastKey.get(SK).s());

    return new Page<>(page.items(), nextCursor);
  }

  // Strongly consistent, so a retry that finds the workout already written can always read it
  // back, even milliseconds after the first request. It costs one read unit instead of half
  @Override
  public Optional<Workout> findById(String userId, String workoutId) {
    Key key =
        Key.builder()
            .partitionValue(USER_PK_PREFIX + userId)
            .sortValue(WORKOUT_SK_PREFIX + workoutId)
            .build();

    return Optional.ofNullable(table.getItem(r -> r.key(key).consistentRead(true)));
  }

  @Override
  public boolean create(Workout workout) {
    try {
      table.putItem(
          PutItemEnhancedRequest.builder(Workout.class)
              .item(workout)
              .conditionExpression(WORKOUT_DOES_NOT_EXIST)
              .build());
      return true;
    } catch (ConditionalCheckFailedException ex) {
      return false;
    }
  }
}
