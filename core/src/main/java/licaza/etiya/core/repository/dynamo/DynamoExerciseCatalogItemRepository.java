package licaza.etiya.core.repository.dynamo;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import licaza.etiya.core.model.ExerciseCatalogItem;
import licaza.etiya.core.repository.ExerciseCatalogItemRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.ScanEnhancedRequest;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

@Repository
public class DynamoExerciseCatalogItemRepository implements ExerciseCatalogItemRepository {

  private final DynamoDbTable<ExerciseCatalogItem> table;

  public DynamoExerciseCatalogItemRepository(
      @Qualifier("dynamoDbEnhancedClient") DynamoDbEnhancedClient enhancedClient) {
    this.table =
        enhancedClient.table("GymAppTable", TableSchemaFactory.createExerciseCatalogItemSchema());
  }

  @Override
  public void save(ExerciseCatalogItem exercise) {
    if (!exercise.getId().startsWith("exe-")) {
      exercise.setId("exe-" + exercise.getId());
    }
    table.putItem(exercise);
  }

  @Override
  public Optional<ExerciseCatalogItem> findById(String id) {
    String finalId = id.startsWith("exe-") ? id : "exe-" + id;
    return Optional.ofNullable(table.getItem(r -> r.key(k -> k.partitionValue(finalId))));
  }

  @Override
  public List<ExerciseCatalogItem> searchByName(String query) {
    String searchKey = "exe-" + query.toLowerCase().replaceAll("\\s+", "-");
    Map<String, AttributeValue> expressionValues = new HashMap<>();
    expressionValues.put(":prefix", AttributeValue.builder().s(searchKey).build());

    Expression filterExpression =
        Expression.builder()
            .expression("begins_with(id, :prefix)")
            .expressionValues(expressionValues)
            .build();

    ScanEnhancedRequest scanRequest =
        ScanEnhancedRequest.builder().filterExpression(filterExpression).build();

    return table.scan(scanRequest).items().stream().collect(Collectors.toList());
  }

  @Override
  public List<ExerciseCatalogItem> findByMuscleGroup(String muscleGroup) {
    // Filter items with prefix 'exe-' and belong to selected muscular group
    return table.scan().items().stream()
        .filter(e -> e.getId().startsWith("exe-"))
        .filter(e -> e.getMuscleGroup().equalsIgnoreCase(muscleGroup))
        .collect(Collectors.toList());
  }
}
