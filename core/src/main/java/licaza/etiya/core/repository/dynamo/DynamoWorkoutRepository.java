package licaza.etiya.core.repository.dynamo;

import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.USER_PK_PREFIX;
import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.WORKOUT_SK_PREFIX;

import java.util.List;
import licaza.etiya.core.model.Workout;
import licaza.etiya.core.repository.WorkoutRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;

@Repository
public class DynamoWorkoutRepository implements WorkoutRepository {

  private final DynamoDbTable<Workout> table;

  public DynamoWorkoutRepository(
      @Qualifier("dynamoDbEnhancedClient") DynamoDbEnhancedClient enhancedClient,
      @Value("${etiya.dynamodb.table-name}") String tableName) {
    this.table = enhancedClient.table(tableName, TableSchemaFactory.createWorkoutSchema());
  }

  // Newest first: the sort key starts with the workout's dateTime
  @Override
  public List<Workout> findByUserId(String userId) {
    Key key =
        Key.builder().partitionValue(USER_PK_PREFIX + userId).sortValue(WORKOUT_SK_PREFIX).build();

    return table
        .query(
            r -> r.queryConditional(QueryConditional.sortBeginsWith(key)).scanIndexForward(false))
        .items()
        .stream()
        .toList();
  }

  @Override
  public void save(Workout workout) {
    table.putItem(workout);
  }
}
