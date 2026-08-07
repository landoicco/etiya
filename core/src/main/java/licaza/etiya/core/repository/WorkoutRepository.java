package licaza.etiya.core.repository;

import java.util.List;
import licaza.etiya.core.model.Workout;

public interface WorkoutRepository {
  void save(Workout workout);

  List<Workout> findAll();

  List<Workout> findByUserId(String userId);
}
