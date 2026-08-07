package licaza.etiya.core.repository.dynamo;

import static software.amazon.awssdk.enhanced.dynamodb.mapper.StaticAttributeTags.primaryPartitionKey;
import static software.amazon.awssdk.enhanced.dynamodb.mapper.StaticAttributeTags.primarySortKey;

import licaza.etiya.core.model.*;
import software.amazon.awssdk.enhanced.dynamodb.EnhancedType;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.mapper.StaticTableSchema;

public class TableSchemaFactory {

  // Factory for the Gym schema
  public static TableSchema<Gym> createGymSchema() {
    return StaticTableSchema.builder(Gym.class)
        .newItemSupplier(Gym::new)
        .addAttribute(
            String.class,
            a -> a.name("id").getter(Gym::getId).setter(Gym::setId).tags(primaryPartitionKey()))
        .addAttribute(String.class, a -> a.name("name").getter(Gym::getName).setter(Gym::setName))
        .addAttribute(
            String.class, a -> a.name("location").getter(Gym::getLocation).setter(Gym::setLocation))
        .build();
  }

  // Factory for ExerciseCatalogItem schema
  public static TableSchema<ExerciseCatalogItem> createExerciseCatalogItemSchema() {
    return StaticTableSchema.builder(ExerciseCatalogItem.class)
        .newItemSupplier(ExerciseCatalogItem::new)
        .addAttribute(
            String.class,
            a ->
                a.name("id")
                    .getter(ExerciseCatalogItem::getId)
                    .setter(ExerciseCatalogItem::setId)
                    .tags(primaryPartitionKey()))
        .addAttribute(
            String.class,
            a ->
                a.name("name")
                    .getter(ExerciseCatalogItem::getName)
                    .setter(ExerciseCatalogItem::setName))
        .addAttribute(
            String.class,
            a ->
                a.name("muscleGroup")
                    .getter(ExerciseCatalogItem::getMuscleGroup)
                    .setter(ExerciseCatalogItem::setMuscleGroup))
        .build();
  }

  // Factory for Workout schema
  public static TableSchema<Workout> createWorkoutSchema() {
    // GymSet
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

    // Exercise
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

    // Workout
    return StaticTableSchema.builder(Workout.class)
        .newItemSupplier(Workout::new)
        .addAttribute(
            String.class,
            a ->
                a.name("userId")
                    .getter(Workout::getUserId)
                    .setter(Workout::setUserId)
                    .tags(primaryPartitionKey()))
        .addAttribute(
            String.class,
            a -> a.name("id").getter(Workout::getId).setter(Workout::setId).tags(primarySortKey()))
        .addAttribute(
            String.class,
            a -> a.name("dateTime").getter(Workout::getDateTime).setter(Workout::setDateTime))
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
}
