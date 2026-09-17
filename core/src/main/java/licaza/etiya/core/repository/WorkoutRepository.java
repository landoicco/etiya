package licaza.etiya.core.repository;

import licaza.etiya.core.model.Page;
import licaza.etiya.core.model.Workout;

public interface WorkoutRepository {
  void save(Workout workout);

  // cursor is the nextCursor of a previous page, or null for the first one
  Page<Workout> findByUserId(String userId, int limit, String cursor);
}
