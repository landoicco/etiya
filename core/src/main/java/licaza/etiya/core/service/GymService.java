package licaza.etiya.core.service;

import java.util.List;
import licaza.etiya.core.exception.GymNotFoundException;
import licaza.etiya.core.exception.InputValidationException;
import licaza.etiya.core.model.Gym;
import licaza.etiya.core.repository.GymRepository;
import licaza.etiya.core.service.validation.InputValidationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
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
      String generatedId = Slugs.of(input.getName());
      if (generatedId.isEmpty()) {
        throw new InputValidationException(
            "❌ Validation Error: Gym name must contain letters or numbers");
      }
      input.setId(generatedId);
      log.debug("🆔 Generated new slug ID for gym: {}", generatedId);
    }

    gymRepository.save(input);
    return input;
  }

  // Without a usable query, the whole catalog is returned
  public List<Gym> searchGyms(String query) {
    String slugPrefix = (query == null) ? "" : Slugs.of(query);
    if (slugPrefix.isEmpty()) {
      log.info("🔍 No query given, listing the whole gym catalog");
      return gymRepository.findAll();
    }

    log.info("🔍 Searching gyms in database with query: '{}' (slug '{}')", query, slugPrefix);
    return gymRepository.findBySlugPrefix(slugPrefix);
  }

  public Gym getGym(String id) {
    return gymRepository
        .findById(id)
        .orElseThrow(
            () ->
                new GymNotFoundException("❌ Error: The gym with ID '" + id + "' does not exist."));
  }
}
