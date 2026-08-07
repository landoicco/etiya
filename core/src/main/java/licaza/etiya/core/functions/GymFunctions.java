package licaza.etiya.core.functions;

import java.util.List;
import java.util.function.Function;
import licaza.etiya.core.exception.FunctionWrapper;
import licaza.etiya.core.model.Gym;
import licaza.etiya.core.service.GymService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.support.MessageBuilder;

@Slf4j
@Configuration
public class GymFunctions {

  private final GymService service;

  public GymFunctions(GymService service) {
    this.service = service;
  }

  @Bean
  public Function<Message<Gym>, Message<?>> registerGym() {
    return FunctionWrapper.<Gym, Object>safe(
        input -> {
          Gym gymInput = input.getPayload();

          log.info("📥 Request received to register a new gym: '{}'", gymInput.getName());

          Gym savedGym = service.registerGym(gymInput);

          log.info("🏢 Gym successfully processed and saved with ID: {}", savedGym.getId());

          return MessageBuilder.withPayload((Object) savedGym)
              .setHeader("statusCode", 201)
              .setHeader("Content-Type", "application/json")
              .build();
        });
  }

  @Bean
  public Function<Message<String>, Message<?>> searchGyms() {
    return FunctionWrapper.<String, Object>safe(
        input -> {
          String query = input.getPayload();

          log.info("📥 Request received to search gyms with query: '{}'", query);

          List<Gym> results = service.searchGyms(query);

          log.info("✨ Search completed. Found {} gyms.", results.size());

          return MessageBuilder.withPayload((Object) results)
              .setHeader("statusCode", 200)
              .setHeader("Content-Type", "application/json")
              .build();
        });
  }
}
