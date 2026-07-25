package licaza.etiya.core.repository;

import java.util.List;
import java.util.Optional;
import licaza.etiya.core.model.Gym;

public interface GymRepository {
  void save(Gym gym);

  List<Gym> searchByName(String query);

  List<Gym> findAll();

  Optional<Gym> findById(String id);
}
