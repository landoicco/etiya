package licaza.etiya.core.repository;

import java.util.List;
import java.util.Optional;
import licaza.etiya.core.model.Gym;

public interface GymRepository {
  void save(Gym gym);

  // slugPrefix must already be normalized with Slugs.of, like the stored IDs
  List<Gym> findBySlugPrefix(String slugPrefix);

  List<Gym> findAll();

  Optional<Gym> findById(String id);
}
