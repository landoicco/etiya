package licaza.etiya.core.repository.dynamo;

import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.EXERCISE_PK;
import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.EXERCISE_SK_PREFIX;

import java.util.List;
import java.util.Optional;
import licaza.etiya.core.model.ExerciseCatalogItem;
import licaza.etiya.core.repository.ExerciseCatalogItemRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;

@Repository
public class DynamoExerciseCatalogItemRepository implements ExerciseCatalogItemRepository {

  private final DynamoDbTable<ExerciseCatalogItem> table;

  public DynamoExerciseCatalogItemRepository(
      @Qualifier("dynamoDbEnhancedClient") DynamoDbEnhancedClient enhancedClient,
      @Value("${etiya.dynamodb.table-name}") String tableName) {
    this.table =
        enhancedClient.table(tableName, TableSchemaFactory.createExerciseCatalogItemSchema());
  }

  @Override
  public void save(ExerciseCatalogItem exercise) {
    table.putItem(exercise);
  }

  @Override
  public Optional<ExerciseCatalogItem> findById(String id) {
    Key key = Key.builder().partitionValue(EXERCISE_PK).sortValue(EXERCISE_SK_PREFIX + id).build();

    return Optional.ofNullable(table.getItem(key));
  }

  @Override
  public List<ExerciseCatalogItem> searchByName(String query) {
    String slugPrefix = query.trim().toLowerCase().replaceAll("\\s+", "-");
    Key key =
        Key.builder()
            .partitionValue(EXERCISE_PK)
            .sortValue(EXERCISE_SK_PREFIX + slugPrefix)
            .build();

    return table
        .query(r -> r.queryConditional(QueryConditional.sortBeginsWith(key)))
        .items()
        .stream()
        .toList();
  }

  @Override
  public List<ExerciseCatalogItem> findAll() {
    Key key = Key.builder().partitionValue(EXERCISE_PK).build();

    return table.query(r -> r.queryConditional(QueryConditional.keyEqualTo(key))).items().stream()
        .toList();
  }
}
