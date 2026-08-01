package licaza.etiya.core.functions;

import java.util.List;
import java.util.function.Function;
import java.util.function.Supplier;
import licaza.etiya.core.exception.FunctionWrapper;
import licaza.etiya.core.model.Workout;
import licaza.etiya.core.service.WorkoutService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;

@Slf4j
@Configuration
public class WorkoutFunctions {

  private final WorkoutService service;

  public WorkoutFunctions(WorkoutService service) {
    this.service = service;
  }

  @Bean
  public Function<Message<Workout>, Message<?>> registerWorkout() {
    return FunctionWrapper.<Workout, Object>safe(
        input -> {

          // Get Workout object from payload
          Workout workoutInput = input.getPayload();

          int exerciseCount =
              (workoutInput.getExercises() != null) ? workoutInput.getExercises().size() : 0;
          log.info(
              "📥 Incoming request to register workout at Gym ID: '{}' with {} exercises.",
              workoutInput.getGymId(),
              exerciseCount);

          Workout savedWorkout = service.registerWorkout(workoutInput);

          log.info(
              "🏋️‍♂️ Workout successfully registered and persisted with ID: {}",
              savedWorkout.getId());

          // Build return message
          Message<Object> response =
              MessageBuilder.withPayload((Object) savedWorkout)
                  .setHeader("statusCode", 201)
                  .setHeader("Content-Type", "application/json")
                  .build();

          return response;
        });
  }

  @Bean
  public Supplier<Message<?>> getAllWorkouts() {
    return FunctionWrapper.<Object>safe(
        () -> {
          log.info("📥 Incoming request to fetch all workouts.");

          List<Workout> workouts = service.getAllWorkouts();

          log.info("✨ Successfully retrieved {} workouts from DynamoDB.", workouts.size());

          // Build return message
          Message<Object> response =
              MessageBuilder.withPayload((Object) workouts)
                  .setHeader("statusCode", 200)
                  .setHeader("Content-Type", "application/json")
                  .build();

          return response;
        });
  }
}
