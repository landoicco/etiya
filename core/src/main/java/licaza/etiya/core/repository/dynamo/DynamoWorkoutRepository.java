package licaza.etiya.core.repository.dynamo;

import static software.amazon.awssdk.enhanced.dynamodb.mapper.StaticAttributeTags.primaryPartitionKey;

import jakarta.annotation.PostConstruct;
import java.util.List;
import licaza.etiya.core.model.Exercise;
import licaza.etiya.core.model.GymSet;
import licaza.etiya.core.model.WeightUnit;
import licaza.etiya.core.model.Workout;
import licaza.etiya.core.repository.WorkoutRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.EnhancedType;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.mapper.StaticTableSchema;

@Repository
public class DynamoWorkoutRepository implements WorkoutRepository {

  private final DynamoDbTable<Workout> table;

  public DynamoWorkoutRepository(
      @Qualifier("dynamoDbEnhancedClient") DynamoDbEnhancedClient enhancedClient) {

    // Schema for GymSet
    TableSchema<GymSet> gymSetSchema =
        StaticTableSchema.builder(GymSet.class)
            .newItemSupplier(GymSet::new)
            .addAttribute(
                Integer.class,
                a -> a.name("count").getter(GymSet::getCount).setter(GymSet::setCount))
            .addAttribute(
                Double.class,
                a -> a.name("weight").getter(GymSet::getWeight).setter(GymSet::setWeight))
            .addAttribute(
                WeightUnit.class,
                a -> a.name("unit").getter(GymSet::getUnit).setter(GymSet::setUnit))
            .build();

    // Schema for Exercise
    TableSchema<Exercise> exerciseSchema =
        StaticTableSchema.builder(Exercise.class)
            .newItemSupplier(Exercise::new)
            .addAttribute(
                String.class,
                a -> a.name("name").getter(Exercise::getName).setter(Exercise::setName))
            .addAttribute(
                EnhancedType.listOf(EnhancedType.documentOf(GymSet.class, gymSetSchema)),
                a -> a.name("sets").getter(Exercise::getSets).setter(Exercise::setSets))
            .build();

    // Principal schema for Workout
    TableSchema<Workout> workoutSchema =
        StaticTableSchema.builder(Workout.class)
            .newItemSupplier(Workout::new)
            .addAttribute(
                String.class,
                a ->
                    a.name("id")
                        .getter(Workout::getId)
                        .setter(Workout::setId)
                        .tags(primaryPartitionKey()))
            .addAttribute(
                String.class,
                a -> a.name("dateTime").getter(Workout::getDateTime).setter(Workout::setDateTime))
            .addAttribute(
                EnhancedType.listOf(EnhancedType.documentOf(Exercise.class, exerciseSchema)),
                a ->
                    a.name("exercises").getter(Workout::getExercises).setter(Workout::setExercises))
            .build();

    this.table = enhancedClient.table("Workouts", workoutSchema);
  }

  @PostConstruct
  public void initTable() {
    try {
      this.table.createTable();
    } catch (Exception e) {
      // Table already exist
    }
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
