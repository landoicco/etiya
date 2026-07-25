package licaza.etiya.core.functions;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.util.List;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import licaza.etiya.core.model.Gym;
import licaza.etiya.core.repository.GymRepository;
import licaza.etiya.core.repository.dynamo.DynamoGymRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GymFunctions {

  private final GymRepository gymRepository;
  private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

  public GymFunctions(DynamoGymRepository gymRepository) {
    this.gymRepository = gymRepository;
  }

  @Bean
  public Function<Gym, Gym> registerGym() {
    return input -> {
      // Jakarta validations
      Set<ConstraintViolation<Gym>> violations = validator.validate(input);
      if (!violations.isEmpty()) {
        String errorMsg =
            violations.stream()
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.joining(", "));
        throw new IllegalArgumentException("❌ Validation Error: " + errorMsg);
      }

      // Generate ID, if its empty
      if (input.getId() == null || input.getId().trim().isEmpty()) {
        input.setId(input.getName().toLowerCase().replaceAll("\\s+", "-"));
      }

      gymRepository.save(input);
      System.out.println("🏢 Gym data saved and validated! ID: " + input.getId());
      return input;
    };
  }

  @Bean
  public Function<String, List<Gym>> searchGyms() {
    return query -> gymRepository.searchByName(query);
  }
}
