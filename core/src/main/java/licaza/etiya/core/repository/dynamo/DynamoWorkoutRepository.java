package licaza.etiya.core.repository.dynamo;

import java.util.List;
import java.util.stream.Collectors;
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

  @Override
  public List<Workout> findAll() {
    return table.scan().items().stream()
        .filter(wkt -> wkt.getId() != null && wkt.getId().startsWith("wkt-"))
        .collect(Collectors.toList());
  }

  @Override
  public List<Workout> findByUserId(String userId) {
    Key partitionKey = Key.builder().partitionValue(userId).build();

    QueryConditional queryConditional = QueryConditional.keyEqualTo(partitionKey);

    return table.query(r -> r.queryConditional(queryConditional)).items().stream()
        .filter(wkt -> wkt.getId() != null && wkt.getId().startsWith("wkt-"))
        .collect(Collectors.toList());
  }

  @Override
  public void save(Workout workout) {
    table.putItem(workout);
  }
}
