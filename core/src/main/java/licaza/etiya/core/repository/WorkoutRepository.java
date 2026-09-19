package licaza.etiya.core.repository;

import java.util.Optional;
import licaza.etiya.core.model.Page;
import licaza.etiya.core.model.Workout;

public interface WorkoutRepository {
  // Returns false, and writes nothing, when the owner already has a workout with that ID
  boolean create(Workout workout);

  // Scoped to the owner: another user's workout is never returned
  Optional<Workout> findById(String userId, String workoutId);

  // cursor is the nextCursor of a previous page, or null for the first one
  Page<Workout> findByUserId(String userId, int limit, String cursor);
}
