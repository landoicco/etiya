package licaza.etiya.core.repository;

import java.util.List;
import java.util.Optional;
import licaza.etiya.core.model.ExerciseCatalogItem;

public interface ExerciseCatalogItemRepository {
  void save(ExerciseCatalogItem exercise);

  List<ExerciseCatalogItem> searchByName(String query);

  List<ExerciseCatalogItem> findByMuscleGroup(String muscleGroup);

  Optional<ExerciseCatalogItem> findById(String id);
}
