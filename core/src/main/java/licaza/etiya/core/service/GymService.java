package licaza.etiya.core.service;

import java.util.List;
import licaza.etiya.core.model.Gym;
import licaza.etiya.core.repository.GymRepository;
import licaza.etiya.core.service.validation.InputValidationService;
import org.springframework.stereotype.Service;

@Service
public class GymService {

  private final InputValidationService validatorService;
  private final GymRepository gymRepository;

  public GymService(InputValidationService validatorService, GymRepository gymRepository) {
    this.validatorService = validatorService;
    this.gymRepository = gymRepository;
  }

  public Gym registerGym(Gym input) {
    validatorService.validate(input);

    // Generate ID slug
    if (input.getId() == null || input.getId().trim().isEmpty()) {
      input.setId(input.getName().toLowerCase().replaceAll("\\s+", "-"));
    }

    gymRepository.save(input);
    return input;
  }

  public List<Gym> searchGyms(String query) {
    return gymRepository.searchByName(query);
  }
}
