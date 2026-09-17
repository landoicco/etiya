package licaza.etiya.core.repository;

import java.util.List;
import java.util.Optional;
import licaza.etiya.core.model.ExerciseCatalogItem;

public interface ExerciseCatalogItemRepository {
  // Returns false, without overwriting, when an exercise with the same ID already exists
  boolean create(ExerciseCatalogItem exercise);

  // slugPrefix must already be normalized with Slugs.of, like the stored IDs
  List<ExerciseCatalogItem> findBySlugPrefix(String slugPrefix);

  List<ExerciseCatalogItem> findAll();

  Optional<ExerciseCatalogItem> findById(String id);
}
