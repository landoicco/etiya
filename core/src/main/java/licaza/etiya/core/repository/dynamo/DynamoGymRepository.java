package licaza.etiya.core.repository.dynamo;

import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.GYM_PK;
import static licaza.etiya.core.repository.dynamo.TableSchemaFactory.GYM_SK_PREFIX;

import java.util.List;
import java.util.Optional;
import licaza.etiya.core.model.Gym;
import licaza.etiya.core.repository.GymRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.Key;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;

@Repository
public class DynamoGymRepository implements GymRepository {

  private final DynamoDbTable<Gym> table;

  public DynamoGymRepository(
      @Qualifier("dynamoDbEnhancedClient") DynamoDbEnhancedClient enhancedClient,
      @Value("${etiya.dynamodb.table-name}") String tableName) {
    this.table = enhancedClient.table(tableName, TableSchemaFactory.createGymSchema());
  }

  @Override
  public void save(Gym gym) {
    table.putItem(gym);
  }

  @Override
  public List<Gym> findBySlugPrefix(String slugPrefix) {
    Key key = Key.builder().partitionValue(GYM_PK).sortValue(GYM_SK_PREFIX + slugPrefix).build();

    return table
        .query(r -> r.queryConditional(QueryConditional.sortBeginsWith(key)))
        .items()
        .stream()
        .toList();
  }

  @Override
  public List<Gym> findAll() {
    Key key = Key.builder().partitionValue(GYM_PK).build();

    return table.query(r -> r.queryConditional(QueryConditional.keyEqualTo(key))).items().stream()
        .toList();
  }

  @Override
  public Optional<Gym> findById(String id) {
    Key key = Key.builder().partitionValue(GYM_PK).sortValue(GYM_SK_PREFIX + id).build();

    return Optional.ofNullable(table.getItem(key));
  }
}
