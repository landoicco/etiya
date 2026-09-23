package licaza.etiya.core.repository;

import java.util.List;
import java.util.Optional;
import licaza.etiya.core.model.ExerciseCatalogItem;

// Every read names whose exercises it looks at: one user's, or the shared catalog's
public interface ExerciseCatalogItemRepository {
  // The ownerId that means the shared catalog
  String SHARED_CATALOG = null;

  // Written where its ownerId says. Returns false, without overwriting, when an exercise with the
  // same ID already exists there
  boolean create(ExerciseCatalogItem exercise);

  // slugPrefix must already be normalized with Slugs.of, like the stored IDs
  List<ExerciseCatalogItem> findBySlugPrefix(String ownerId, String slugPrefix);

  List<ExerciseCatalogItem> findAll(String ownerId);

  Optional<ExerciseCatalogItem> findById(String ownerId, String id);
}
