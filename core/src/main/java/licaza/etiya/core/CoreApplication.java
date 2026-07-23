package licaza.etiya.core;

import java.util.function.Function;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class CoreApplication {

  public static void main(String[] args) {
    SpringApplication.run(CoreApplication.class, args);
  }

  @Bean
  public Function<String, ResponseMessage> greeting() {
    return input -> new ResponseMessage("¡Hey, " + input + "! your Lambda is working.");
  }
}

@Data
@NoArgsConstructor
@AllArgsConstructor
class ResponseMessage {
  private String message;
}
