package licaza.etiya.core.repository.dynamo;

import java.util.List;
import licaza.etiya.core.model.Workout;
import licaza.etiya.core.repository.WorkoutRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;

@Repository
public class DynamoWorkoutRepository implements WorkoutRepository {

  private final DynamoDbTable<Workout> table;

  public DynamoWorkoutRepository(
      @Qualifier("dynamoDbEnhancedClient") DynamoDbEnhancedClient enhancedClient) {
    this.table = enhancedClient.table("GymAppTable", TableSchemaFactory.createWorkoutSchema());
  }

  @Override
  public List<Workout> findAll() {
    return table.scan().items().stream().collect(java.util.stream.Collectors.toList());
  }

  @Override
  public void save(Workout workout) {
    table.putItem(workout);
  }
}
