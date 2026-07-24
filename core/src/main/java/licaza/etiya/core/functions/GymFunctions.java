package licaza.etiya.core.functions;

import java.util.List;
import java.util.function.Function;
import licaza.etiya.core.model.Gym;
import licaza.etiya.core.repository.dynamo.DynamoGymRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GymFunctions {

  private final DynamoGymRepository gymRepository;

  public GymFunctions(DynamoGymRepository gymRepository) {
    this.gymRepository = gymRepository;
  }

  @Bean
  public Function<Gym, Gym> registerGym() {
    return input -> {
      if (input.getId() == null || input.getId().isEmpty()) {
        input.setId(input.getName().toLowerCase().replaceAll("\\s+", "-"));
      }

      gymRepository.save(input);
      System.out.println("🏢 Gym stored on catalog! unique ID: " + input.getId());

      return input;
    };
  }

  @Bean
  public Function<String, List<Gym>> searchGyms() {
    return query -> gymRepository.searchByName(query);
  }
}
