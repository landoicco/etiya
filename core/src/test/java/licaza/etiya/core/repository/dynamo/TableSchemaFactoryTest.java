package licaza.etiya.core.repository.dynamo;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import licaza.etiya.core.model.ExerciseCatalogItem;
import licaza.etiya.core.model.ExerciseCategory;
import licaza.etiya.core.model.Gym;
import licaza.etiya.core.model.MuscleGroup;
import licaza.etiya.core.model.Workout;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

// The key layout is documented in docs/data-model.md, and DynamoDbLocalInitializer and the CDK
// stack depend on the PK and SK names
class TableSchemaFactoryTest {

  @Test
  void workoutsLiveUnderTheirOwner() {
    Workout workout = new Workout();
    workout.setUserId("user-123");
    workout.setId("01K1H3ZC8R0000000000000000");

    Map<String, AttributeValue> item =
        TableSchemaFactory.createWorkoutSchema().itemToMap(workout, true);

    assertThat(item.get("PK").s()).isEqualTo("USER#user-123");
    assertThat(item.get("SK").s()).isEqualTo("WORKOUT#01K1H3ZC8R0000000000000000");
  }

  @Test
  void gymsShareOnePartition() {
    Gym gym = new Gym("golds-gym-sunset-st-los-angeles", "Golds Gym", "Sunset St", "Los Angeles");

    Map<String, AttributeValue> item = TableSchemaFactory.createGymSchema().itemToMap(gym, true);

    assertThat(item.get("PK").s()).isEqualTo("GYM");
    assertThat(item.get("SK").s()).isEqualTo("GYM#golds-gym-sunset-st-los-angeles");
  }

  @Test
  void exercisesShareOnePartition() {
    ExerciseCatalogItem exercise =
        new ExerciseCatalogItem(
            "barbell-bench-press", "Barbell Bench Press", MuscleGroup.CHEST, ExerciseCategory.PUSH);

    Map<String, AttributeValue> item =
        TableSchemaFactory.createExerciseCatalogItemSchema().itemToMap(exercise, true);

    assertThat(item.get("PK").s()).isEqualTo("EXERCISE");
    assertThat(item.get("SK").s()).isEqualTo("EXERCISE#barbell-bench-press");
  }

  // Enums are stored by name, so the stored value is what the API returns
  @Test
  void exerciseCategoryAndMuscleGroupAreStoredByName() {
    ExerciseCatalogItem exercise =
        new ExerciseCatalogItem("pull-ups", "Pull-ups", MuscleGroup.BACK, ExerciseCategory.PULL);

    Map<String, AttributeValue> item =
        TableSchemaFactory.createExerciseCatalogItemSchema().itemToMap(exercise, true);

    assertThat(item.get("category").s()).isEqualTo("PULL");
    assertThat(item.get("muscleGroup").s()).isEqualTo("BACK");
  }

  // A missing part leaves the key out, so DynamoDB rejects the item instead of storing
  // something like "GYM#null"
  @Test
  void missingIdProducesNoKey() {
    Gym gym = new Gym(null, "Golds Gym", null, "Los Angeles");
    Workout workout = new Workout();
    workout.setId("01K1H3ZC8R0000000000000000");

    assertThat(TableSchemaFactory.createGymSchema().itemToMap(gym, true)).doesNotContainKey("SK");
    assertThat(TableSchemaFactory.createWorkoutSchema().itemToMap(workout, true))
        .doesNotContainKey("PK");
  }
}
