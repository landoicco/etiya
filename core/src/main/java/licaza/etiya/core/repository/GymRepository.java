package licaza.etiya.core.repository;

import java.util.List;
import licaza.etiya.core.model.Gym;

public interface GymRepository {
  void save(Gym gym);

  List<Gym> searchByName(String query);

  List<Gym> findAll();
}
