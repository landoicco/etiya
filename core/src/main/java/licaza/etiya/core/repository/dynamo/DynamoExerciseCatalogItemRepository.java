package licaza.etiya.core.repository.dynamo;

import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.EXERCISE_SK_PREFIX;
import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.PK;
import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.exercisePartition;

import java.util.List;
import java.util.Optional;
import licaza.etiya.core.model.ExerciseCatalogItem;
import licaza.etiya.core.repository.ExerciseCatalogItemRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Expression;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.model.PutItemEnhancedRequest;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.services.dynamodb.model.ConditionalCheckFailedException;

@Repository
public class DynamoExerciseCatalogItemRepository implements ExerciseCatalogItemRepository {

  // Checked atomically by DynamoDB, so two concurrent creations can't both succeed
  private static final Expression EXERCISE_DOES_NOT_EXIST =
      Expression.builder()
          .expression("attribute_not_exists(#pk)")
          .putExpressionName("#pk", PK)
          .build();

  private final DynamoDbTable<ExerciseCatalogItem> table;

  public DynamoExerciseCatalogItemRepository(
      @Qualifier("dynamoDbEnhancedClient") DynamoDbEnhancedClient enhancedClient,
      @Value("${etiya.dynamodb.table-name}") String tableName) {
    this.table =
        enhancedClient.table(tableName, TableSchemaFactory.createExerciseCatalogItemSchema());
  }

  @Override
  public boolean create(ExerciseCatalogItem exercise) {
    try {
      table.putItem(
          PutItemEnhancedRequest.builder(ExerciseCatalogItem.class)
              .item(exercise)
              .conditionExpression(EXERCISE_DOES_NOT_EXIST)
              .build());
      return true;
    } catch (ConditionalCheckFailedException ex) {
      return false;
    }
  }

  @Override
  public Optional<ExerciseCatalogItem> findById(String ownerId, String id) {
    Key key =
        Key.builder()
            .partitionValue(exercisePartition(ownerId))
            .sortValue(EXERCISE_SK_PREFIX + id)
            .build();

    return Optional.ofNullable(table.getItem(key));
  }

  @Override
  public List<ExerciseCatalogItem> findBySlugPrefix(String ownerId, String slugPrefix) {
    Key key =
        Key.builder()
            .partitionValue(exercisePartition(ownerId))
            .sortValue(EXERCISE_SK_PREFIX + slugPrefix)
            .build();

    return table
        .query(r -> r.queryConditional(QueryConditional.sortBeginsWith(key)))
        .items()
        .stream()
        .toList();
  }

  // A user's partition also holds their workouts, so only the EXERCISE# items are read
  @Override
  public List<ExerciseCatalogItem> findAll(String ownerId) {
    return findBySlugPrefix(ownerId, "");
  }
}
