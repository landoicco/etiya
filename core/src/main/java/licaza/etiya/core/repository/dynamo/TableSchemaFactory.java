package licaza.etiya.core.repository.dynamo;

import static software.amazon.awssdk.enhanced.dynamodb.mapper.StaticAttributeTags.primaryPartitionKey;
import static software.amazon.awssdk.enhanced.dynamodb.mapper.StaticAttributeTags.primarySortKey;

import licaza.etiya.core.model.*;
import software.amazon.awssdk.enhanced.dynamodb.EnhancedType;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.mapper.StaticTableSchema;

public class TableSchemaFactory {

  public static final String PK = "PK";
  public static final String SK = "SK";

  public static final String GYM_PK = "GYM";
  public static final String GYM_SK_PREFIX = "GYM#";
  public static final String EXERCISE_PK = "EXERCISE";
  public static final String EXERCISE_SK_PREFIX = "EXERCISE#";
  public static final String USER_PK_PREFIX = "USER#";
  public static final String WORKOUT_SK_PREFIX = "WORKOUT#";

  // Keys are derived from model fields, so the setters intentionally do nothing
  public static TableSchema<Gym> createGymSchema() {
    return StaticTableSchema.builder(Gym.class)
        .newItemSupplier(Gym::new)
        .addAttribute(
            String.class,
            a -> a.name(PK).getter(g -> GYM_PK).setter((g, v) -> {}).tags(primaryPartitionKey()))
        .addAttribute(
            String.class,
            a ->
                a.name(SK)
                    .getter(g -> key(GYM_SK_PREFIX, g.getId()))
                    .setter((g, v) -> {})
                    .tags(primarySortKey()))
        .addAttribute(String.class, a -> a.name("id").getter(Gym::getId).setter(Gym::setId))
        .addAttribute(String.class, a -> a.name("name").getter(Gym::getName).setter(Gym::setName))
        .addAttribute(
            String.class, a -> a.name("branch").getter(Gym::getBranch).setter(Gym::setBranch))
        .addAttribute(String.class, a -> a.name("city").getter(Gym::getCity).setter(Gym::setCity))
        .build();
  }

  public static TableSchema<ExerciseCatalogItem> createExerciseCatalogItemSchema() {
    return StaticTableSchema.builder(ExerciseCatalogItem.class)
        .newItemSupplier(ExerciseCatalogItem::new)
        .addAttribute(
            String.class,
            a ->
                a.name(PK)
                    .getter(e -> EXERCISE_PK)
                    .setter((e, v) -> {})
                    .tags(primaryPartitionKey()))
        .addAttribute(
            String.class,
            a ->
                a.name(SK)
                    .getter(e -> key(EXERCISE_SK_PREFIX, e.getId()))
                    .setter((e, v) -> {})
                    .tags(primarySortKey()))
        .addAttribute(
            String.class,
            a -> a.name("id").getter(ExerciseCatalogItem::getId).setter(ExerciseCatalogItem::setId))
        .addAttribute(
            String.class,
            a ->
                a.name("name")
                    .getter(ExerciseCatalogItem::getName)
                    .setter(ExerciseCatalogItem::setName))
        .addAttribute(
            MuscleGroup.class,
            a ->
                a.name("muscleGroup")
                    .getter(ExerciseCatalogItem::getMuscleGroup)
                    .setter(ExerciseCatalogItem::setMuscleGroup))
        .addAttribute(
            ExerciseCategory.class,
            a ->
                a.name("category")
                    .getter(ExerciseCatalogItem::getCategory)
                    .setter(ExerciseCatalogItem::setCategory))
        .build();
  }

  public static TableSchema<Workout> createWorkoutSchema() {
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

    TableSchema<Exercise> exerciseSchema =
        StaticTableSchema.builder(Exercise.class)
            .newItemSupplier(Exercise::new)
            .addAttribute(
                String.class,
                a ->
                    a.name("exerciseCatalogItemId")
                        .getter(Exercise::getExerciseCatalogItemId)
                        .setter(Exercise::setExerciseCatalogItemId))
            .addAttribute(
                String.class,
                a -> a.name("name").getter(Exercise::getName).setter(Exercise::setName))
            .addAttribute(
                EnhancedType.listOf(EnhancedType.documentOf(GymSet.class, gymSetSchema)),
                a -> a.name("sets").getter(Exercise::getSets).setter(Exercise::setSets))
            .build();

    return StaticTableSchema.builder(Workout.class)
        .newItemSupplier(Workout::new)
        .addAttribute(
            String.class,
            a ->
                a.name(PK)
                    .getter(w -> key(USER_PK_PREFIX, w.getUserId()))
                    .setter((w, v) -> {})
                    .tags(primaryPartitionKey()))
        .addAttribute(
            String.class,
            a ->
                a.name(SK)
                    .getter(w -> key(WORKOUT_SK_PREFIX, w.getId()))
                    .setter((w, v) -> {})
                    .tags(primarySortKey()))
        .addAttribute(String.class, a -> a.name("id").getter(Workout::getId).setter(Workout::setId))
        .addAttribute(
            String.class,
            a -> a.name("userId").getter(Workout::getUserId).setter(Workout::setUserId))
        .addAttribute(
            String.class,
            a -> a.name("startedAt").getter(Workout::getStartedAt).setter(Workout::setStartedAt))
        .addAttribute(
            String.class,
            a -> a.name("endedAt").getter(Workout::getEndedAt).setter(Workout::setEndedAt))
        .addAttribute(
            String.class, a -> a.name("gymId").getter(Workout::getGymId).setter(Workout::setGymId))
        .addAttribute(
            String.class,
            a -> a.name("gymName").getter(Workout::getGymName).setter(Workout::setGymName))
        .addAttribute(
            EnhancedType.listOf(EnhancedType.documentOf(Exercise.class, exerciseSchema)),
            a -> a.name("exercises").getter(Workout::getExercises).setter(Workout::setExercises))
        .build();
  }

  // Returns null when any part is missing, so the SDK rejects the item instead of storing
  // "GYM#null"
  private static String key(String prefix, String... parts) {
    for (String part : parts) {
      if (part == null) {
        return null;
      }
    }
    return prefix + String.join("#", parts);
  }
}
