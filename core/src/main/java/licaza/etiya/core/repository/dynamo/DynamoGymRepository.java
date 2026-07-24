package licaza.etiya.core.repository.dynamo;

import static software.amazon.awssdk.enhanced.dynamodb.mapper.StaticAttributeTags.primaryPartitionKey;

import jakarta.annotation.PostConstruct;
import java.util.List;
import java.util.stream.Collectors;
import licaza.etiya.core.model.Gym;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.mapper.StaticTableSchema;

@Repository
public class DynamoGymRepository {

  private final DynamoDbTable<Gym> gymTable;

  public DynamoGymRepository(
      @Qualifier("dynamoDbEnhancedClient") DynamoDbEnhancedClient enhancedClient) {
    TableSchema<Gym> gymSchema =
        StaticTableSchema.builder(Gym.class)
            .newItemSupplier(Gym::new)
            .addAttribute(
                String.class,
                a ->
                    a.name("id")
                        .getter(Gym::getId)
                        .setter(Gym::setId)
                        .tags(primaryPartitionKey())) // Set primary key
            .addAttribute(
                String.class, a -> a.name("name").getter(Gym::getName).setter(Gym::setName))
            .addAttribute(
                String.class,
                a -> a.name("location").getter(Gym::getLocation).setter(Gym::setLocation))
            .build();

    this.gymTable = enhancedClient.table("GymAppTable", gymSchema);
  }

  @PostConstruct
  public void initTable() {
    try {
      this.gymTable.createTable();
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
    gymTable.putItem(gym);
  }

  public List<Gym> searchByName(String query) {
    // Search for data with 'gym' prefix
    return gymTable.scan().items().stream()
        .filter(g -> g.getId().startsWith("gym-"))
        .filter(g -> g.getName().toLowerCase().contains(query.toLowerCase()))
        .collect(Collectors.toList());
  }
}
