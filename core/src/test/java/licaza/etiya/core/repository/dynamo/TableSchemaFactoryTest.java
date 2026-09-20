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

  // Every item says which shape it was written with, so a later change can tell them apart.
  // The three types evolve on their own, which is why each carries its own number
  @Test
  void everyItemIsStampedWithItsSchemaVersion() {
    Gym gym = new Gym("golds-gym-los-angeles", "Golds Gym", null, "Los Angeles");
    ExerciseCatalogItem exercise =
        new ExerciseCatalogItem("pull-ups", "Pull-ups", MuscleGroup.BACK, ExerciseCategory.PULL);
    Workout workout = new Workout();
    workout.setUserId("user-123");
    workout.setId("01K1H3ZC8R0000000000000000");

    assertThat(TableSchemaFactory.createGymSchema().itemToMap(gym, true).get("schemaVersion").n())
        .isEqualTo(String.valueOf(TableSchemaFactory.GYM_SCHEMA_VERSION));
    assertThat(
            TableSchemaFactory.createExerciseCatalogItemSchema()
                .itemToMap(exercise, true)
                .get("schemaVersion")
                .n())
        .isEqualTo(String.valueOf(TableSchemaFactory.EXERCISE_SCHEMA_VERSION));
    assertThat(
            TableSchemaFactory.createWorkoutSchema()
                .itemToMap(workout, true)
                .get("schemaVersion")
                .n())
        .isEqualTo(String.valueOf(TableSchemaFactory.WORKOUT_SCHEMA_VERSION));
  }

  // The version is storage-only: it is never read back onto the model, which is what keeps it
  // out of API responses and out of reach of anything a client sends
  @Test
  void theStoredVersionNeverReachesTheModel() {
    Gym gym = new Gym("golds-gym-los-angeles", "Golds Gym", null, "Los Angeles");
    Map<String, AttributeValue> item = TableSchemaFactory.createGymSchema().itemToMap(gym, true);

    assertThat(TableSchemaFactory.createGymSchema().mapToItem(item)).isEqualTo(gym);
  }

  // What a migration will face: an item written before this attribute existed reads back
  // exactly like any other, so nothing has to be backfilled just to keep the app working
  @Test
  void anItemStoredWithoutAVersionStillReads() {
    Gym gym = new Gym("golds-gym-los-angeles", "Golds Gym", null, "Los Angeles");
    Map<String, AttributeValue> stored =
        new java.util.HashMap<>(TableSchemaFactory.createGymSchema().itemToMap(gym, true));
    stored.remove("schemaVersion");

    assertThat(TableSchemaFactory.createGymSchema().mapToItem(stored)).isEqualTo(gym);
  }
}
