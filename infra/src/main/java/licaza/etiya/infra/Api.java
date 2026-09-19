package licaza.etiya.infra;

import java.util.ArrayList;
import java.util.List;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.aws_apigatewayv2_authorizers.HttpUserPoolAuthorizer;
import software.amazon.awscdk.aws_apigatewayv2_authorizers.HttpUserPoolAuthorizerProps;
import software.amazon.awscdk.aws_apigatewayv2_integrations.HttpLambdaIntegration;
import software.amazon.awscdk.services.apigatewayv2.AddRoutesOptions;
import software.amazon.awscdk.services.apigatewayv2.CfnStage;
import software.amazon.awscdk.services.apigatewayv2.CorsHttpMethod;
import software.amazon.awscdk.services.apigatewayv2.CorsPreflightOptions;
import software.amazon.awscdk.services.apigatewayv2.HttpApi;
import software.amazon.awscdk.services.apigatewayv2.HttpMethod;
import software.amazon.awscdk.services.apigatewayv2.HttpRouteIntegration;
import software.amazon.awscdk.services.lambda.IFunction;
import software.amazon.awscdk.services.logs.LogGroup;
import software.amazon.awscdk.services.logs.RetentionDays;
import software.constructs.Construct;

// HTTP API in front of the three Lambdas. Routes must match the route keys declared in core,
// because each handler dispatches on the routeKey the API sends
public class Api extends Construct {

  // Where the frontend runs during development, besides the deployed one. CORS only affects
  // browsers
  private static final List<String> DEV_ORIGINS =
      List.of("http://localhost:5173", "http://localhost:3000");

  // Caps the damage from a runaway client or a bad loop; well within the free tier
  private static final int THROTTLE_RATE_PER_SECOND = 10;
  private static final int THROTTLE_BURST = 20;

  // JSON, so CloudWatch Logs Insights can filter on any field. authorizerError says why a
  // request got a 401; routeKey is "-" for paths that match no route
  private static final String ACCESS_LOG_FORMAT =
      "{\"requestId\":\"$context.requestId\","
          + "\"requestTime\":\"$context.requestTime\","
          + "\"sourceIp\":\"$context.identity.sourceIp\","
          + "\"routeKey\":\"$context.routeKey\","
          + "\"status\":\"$context.status\","
          + "\"latencyMs\":\"$context.responseLatency\","
          + "\"authorizerError\":\"$context.authorizer.error\","
          + "\"error\":\"$context.error.message\"}";

  private final HttpApi httpApi;

  public Api(
      final Construct scope,
      final String id,
      final Auth auth,
      final Functions functions,
      final String webOrigin) {
    super(scope, id);

    List<String> allowedOrigins = new ArrayList<>(DEV_ORIGINS);
    allowedOrigins.add(webOrigin);

    // Applied to every route: API Gateway validates the Cognito token and rejects
    // unauthenticated requests with 401, before any Lambda is invoked
    HttpUserPoolAuthorizer authorizer =
        new HttpUserPoolAuthorizer(
            "CognitoAuthorizer",
            auth.getUserPool(),
            HttpUserPoolAuthorizerProps.builder()
                .authorizerName("etiya-cognito")
                .userPoolClients(List.of(auth.getApiClient()))
                .build());

    this.httpApi =
        HttpApi.Builder.create(this, "HttpApi")
            .apiName(Stack.of(this).getStackName() + "-Api")
            .description("Etiya gym tracker API")
            .defaultAuthorizer(authorizer)
            .corsPreflight(
                CorsPreflightOptions.builder()
                    .allowOrigins(allowedOrigins)
                    .allowMethods(
                        List.of(
                            CorsHttpMethod.GET,
                            CorsHttpMethod.POST,
                            CorsHttpMethod.PUT,
                            CorsHttpMethod.DELETE,
                            CorsHttpMethod.OPTIONS))
                    .allowHeaders(List.of("Authorization", "Content-Type"))
                    .maxAge(Duration.hours(1))
                    .build())
            .build();

    addRoute("Gyms", functions.getGymsApi(), "/gyms", HttpMethod.POST, HttpMethod.GET);
    addRoute("Gym", functions.getGymsApi(), "/gyms/{gymId}", HttpMethod.GET);

    addRoute(
        "Exercises", functions.getExercisesApi(), "/exercises", HttpMethod.POST, HttpMethod.GET);
    addRoute("Exercise", functions.getExercisesApi(), "/exercises/{exerciseId}", HttpMethod.GET);

    addRoute(
        "Workouts", functions.getWorkoutsApi(), "/me/workouts", HttpMethod.POST, HttpMethod.GET);
    addRoute("Workout", functions.getWorkoutsApi(), "/me/workouts/{workoutId}", HttpMethod.GET);

    CfnStage stage = (CfnStage) httpApi.getDefaultStage().getNode().getDefaultChild();
    throttle(stage);
    logAccess(stage);
  }

  private void addRoute(
      final String name, final IFunction target, final String path, final HttpMethod... methods) {
    HttpRouteIntegration integration = new HttpLambdaIntegration(name + "Integration", target);

    httpApi.addRoutes(
        AddRoutesOptions.builder()
            .path(path)
            .methods(List.of(methods))
            .integration(integration)
            .build());
  }

  // The default stage cannot be configured through the L2 construct, so these two methods
  // patch the generated CloudFormation resource directly
  private void throttle(final CfnStage stage) {
    stage.setDefaultRouteSettings(
        CfnStage.RouteSettingsProperty.builder()
            .throttlingRateLimit(THROTTLE_RATE_PER_SECOND)
            .throttlingBurstLimit(THROTTLE_BURST)
            .build());
  }

  // One line per request, including the ones rejected with 401 before reaching any Lambda.
  // Without this, traffic that never gets past the authorizer leaves no trace at all
  private void logAccess(final CfnStage stage) {
    LogGroup accessLogs =
        LogGroup.Builder.create(this, "AccessLogs")
            .retention(RetentionDays.TWO_WEEKS)
            .removalPolicy(RemovalPolicy.DESTROY)
            .build();

    stage.setAccessLogSettings(
        CfnStage.AccessLogSettingsProperty.builder()
            .destinationArn(accessLogs.getLogGroupArn())
            .format(ACCESS_LOG_FORMAT)
            .build());
  }

  public String getApiUrl() {
    return httpApi.getApiEndpoint();
  }
}
