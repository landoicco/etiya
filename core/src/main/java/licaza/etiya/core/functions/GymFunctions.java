package licaza.etiya.core.functions;

import java.util.List;
import java.util.function.Function;
import licaza.etiya.core.model.Gym;
import licaza.etiya.core.service.GymService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class GymFunctions {

  private final GymService service;

  public GymFunctions(GymService service) {
    this.service = service;
  }

  @Bean
  public Function<Gym, Gym> registerGym() {
    return input -> {
      log.info("📥 Request received to register a new gym: '{}'", input.getName());

      Gym savedGym = service.registerGym(input);

      log.info("🏢 Gym successfully processed and saved with ID: {}", savedGym.getId());
      return savedGym;
    };
  }

  @Bean
  public Function<String, List<Gym>> searchGyms() {
    return query -> {
      log.info("📥 Request received to search gyms with query: '{}'", query);

      List<Gym> results = service.searchGyms(query);

      log.info("✨ Search completed. Found {} gyms.", results.size());
      return results;
    };
  }
}
