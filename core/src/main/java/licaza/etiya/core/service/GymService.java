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

    // Generate ID slug. The chain name goes first, so a name search finds every branch;
    // the city is included because branches of the same chain can share a name across cities
    if (input.getId() == null || input.getId().trim().isEmpty()) {
      if (Slugs.of(input.getName()).isEmpty() || Slugs.of(input.getCity()).isEmpty()) {
        throw new InputValidationException(
            "❌ Validation Error: Gym name and city must contain letters or numbers");
      }
      String generatedId = Slugs.of(input.getName(), input.getBranch(), input.getCity());
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
