package licaza.etiya.infra;

import software.amazon.awscdk.Acknowledgment;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.Validations;
import software.amazon.awscdk.services.cognito.AccountRecovery;
import software.amazon.awscdk.services.cognito.AuthFlow;
import software.amazon.awscdk.services.cognito.FeaturePlan;
import software.amazon.awscdk.services.cognito.Mfa;
import software.amazon.awscdk.services.cognito.PasswordPolicy;
import software.amazon.awscdk.services.cognito.SignInAliases;
import software.amazon.awscdk.services.cognito.StandardAttribute;
import software.amazon.awscdk.services.cognito.StandardAttributes;
import software.amazon.awscdk.services.cognito.UserPool;
import software.amazon.awscdk.services.cognito.UserPoolClient;
import software.amazon.awscdk.services.cognito.UserPoolClientOptions;
import software.constructs.Construct;

// Users of the API. The HTTP API validates their tokens and the handlers read the "sub" claim
public class Auth extends Construct {

  private final UserPool userPool;
  private final UserPoolClient apiClient;

  public Auth(final Construct scope, final String id) {
    super(scope, id);

    this.userPool =
        UserPool.Builder.create(this, "UserPool")
            .userPoolName(Stack.of(this).getStackName() + "-Users")
            // Nobody can create their own account; users are created with the AWS CLI
            .selfSignUpEnabled(false)
            .signInAliases(SignInAliases.builder().email(true).build())
            .signInCaseSensitive(false)
            .standardAttributes(
                StandardAttributes.builder()
                    .email(StandardAttribute.builder().required(true).mutable(true).build())
                    .build())
            .passwordPolicy(
                PasswordPolicy.builder()
                    .minLength(8)
                    .requireLowercase(true)
                    .requireUppercase(true)
                    .requireDigits(true)
                    .requireSymbols(true)
                    .build())
            .accountRecovery(AccountRecovery.EMAIL_ONLY)
            .mfa(Mfa.OFF)
            // Cheapest plan; it covers sign-in and JWT, which is all the API needs
            .featurePlan(FeaturePlan.LITE)
            .removalPolicy(RemovalPolicy.DESTROY)
            .build();

    Validations.of(userPool)
        .acknowledge(
            Acknowledgment.builder()
                .id("AwsSolutions-COG2")
                .reason(
                    "Single user in a dev environment. Required MFA would also break the"
                        + " USER_PASSWORD_AUTH flow the CLI uses to get a token for Bruno")
                .build(),
            Acknowledgment.builder()
                .id("AwsSolutions-COG8")
                .reason(
                    "The Plus plan (threat protection) is paid; Lite covers sign-in and JWT,"
                        + " and self sign-up is disabled")
                .build());

    this.apiClient =
        userPool.addClient(
            "ApiClient",
            UserPoolClientOptions.builder()
                .userPoolClientName("etiya-api-client")
                // Public client: a browser or mobile app cannot keep a secret
                .generateSecret(false)
                // USER_PASSWORD_AUTH lets the AWS CLI get a token for Bruno without a hosted UI;
                // SRP is what a real frontend should use
                .authFlows(AuthFlow.builder().userPassword(true).userSrp(true).build())
                .accessTokenValidity(Duration.hours(1))
                .idTokenValidity(Duration.hours(1))
                .refreshTokenValidity(Duration.days(30))
                .preventUserExistenceErrors(true)
                .build());
  }

  public UserPool getUserPool() {
    return userPool;
  }

  public UserPoolClient getApiClient() {
    return apiClient;
  }
}
