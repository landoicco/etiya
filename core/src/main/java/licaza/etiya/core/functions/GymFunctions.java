package licaza.etiya.core.functions;

import java.util.List;
import java.util.function.Function;
import licaza.etiya.core.model.Gym;
import licaza.etiya.core.service.GymService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GymFunctions {

  private final GymService service;

  public GymFunctions(GymService service) {
    this.service = service;
  }

  @Bean
  public Function<Gym, Gym> registerGym() {
    return input -> {
      Gym savedGym = service.registerGym(input);
      System.out.println("🏢 Gym data saved and validated! ID: " + savedGym.getId());
      return savedGym;
    };
  }

  @Bean
  public Function<String, List<Gym>> searchGyms() {
    return query -> service.searchGyms(query);
  }
}
