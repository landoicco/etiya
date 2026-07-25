package licaza.etiya.core.repository.dynamo;

import jakarta.annotation.PostConstruct;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import licaza.etiya.core.model.Gym;
import licaza.etiya.core.repository.GymRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Expression;
import software.amazon.awssdk.enhanced.dynamodb.model.ScanEnhancedRequest;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

@Repository
public class DynamoGymRepository implements GymRepository {

  private final DynamoDbTable<Gym> table;

  public DynamoGymRepository(
      @Qualifier("dynamoDbEnhancedClient") DynamoDbEnhancedClient enhancedClient) {
    this.table = enhancedClient.table("GymAppTable", TableSchemaFactory.createGymSchema());
  }

  @PostConstruct
  public void initTable() {
    try {
      this.table.createTable();
      System.out.println("🎉 Table 'GymAppTable' created!");
    } catch (Exception e) {
      // Table already exists
    }
  }

  public void save(Gym gym) {
    // Add 'gym' prefix to ID
    if (!gym.getId().startsWith("gym-")) {
      gym.setId("gym-" + gym.getId());
    }
    table.putItem(gym);
  }

  public List<Gym> searchByName(String query) {
    String searchKey = "gym-" + query.toLowerCase().replaceAll("\\s+", "-");

    System.out.println("⚡ Searching on DynamoDB: " + searchKey);

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
  public List<Gym> findAll() {
    return table.scan().items().stream()
        .filter(g -> g.getId().startsWith("gym-"))
        .collect(Collectors.toList());
  }

  @Override
  public Optional<Gym> findById(String id) {
    // We add 'gym-' prefix, in case is not present
    String finalId = id.startsWith("gym-") ? id : "gym-" + id;

    System.out.println("⚡ Searching gym by ID: " + finalId);

    // Get item using partition key
    Gym gym = table.getItem(r -> r.key(k -> k.partitionValue(finalId)));

    return Optional.ofNullable(gym);
  }
}
