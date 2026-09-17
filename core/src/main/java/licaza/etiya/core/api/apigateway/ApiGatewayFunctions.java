package licaza.etiya.core.api.apigateway;

import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayV2HTTPResponse;
import java.util.function.Function;
import licaza.etiya.core.api.ExerciseRoutes;
import licaza.etiya.core.api.GymRoutes;
import licaza.etiya.core.api.WorkoutRoutes;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// One function per Lambda; each Lambda selects its bean by name through
// SPRING_CLOUD_FUNCTION_DEFINITION, so renaming a method breaks the deployment
@Configuration
public class ApiGatewayFunctions {

  @Bean
  public Function<APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse> gymsApi(
      ApiGatewayAdapter adapter, GymRoutes routes) {
    return event -> adapter.handle(routes, event);
  }

  @Bean
  public Function<APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse> exercisesApi(
      ApiGatewayAdapter adapter, ExerciseRoutes routes) {
    return event -> adapter.handle(routes, event);
  }

  @Bean
  public Function<APIGatewayV2HTTPEvent, APIGatewayV2HTTPResponse> workoutsApi(
      ApiGatewayAdapter adapter, WorkoutRoutes routes) {
    return event -> adapter.handle(routes, event);
  }
}
