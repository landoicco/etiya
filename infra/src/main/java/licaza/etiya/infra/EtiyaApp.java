package licaza.etiya.infra;

import io.github.cdklabs.cdknag.AwsSolutionsChecks;
import licaza.etiya.infra.EtiyaStack.Kind;
import software.amazon.awscdk.App;
import software.amazon.awscdk.Environment;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.Tags;
import software.amazon.awscdk.Validations;

public final class EtiyaApp {

  public static void main(final String[] args) {
    App app = new App();

    // Two environments: prod stays up and holds real workouts, dev is raised when there is
    // something to try and destroyed afterwards. Both are always defined here, so "cdk deploy"
    // without a stack name would deploy both: always name the stack
    stack(app, "EtiyaProd", Kind.PRODUCTION, "Etiya gym tracker - production");
    stack(app, "EtiyaDev", Kind.DISPOSABLE, "Etiya gym tracker - dev environment");

    // Lets every resource be filtered by project in Cost Explorer
    Tags.of(app).add("project", "etiya");

    // Fails the synth on any finding that is neither fixed nor acknowledged with a reason
    Validations.of(app).addPlugins(new AwsSolutionsChecks(app));

    app.synth();
  }

  // Account and region come from the AWS CLI profile used to run cdk
  private static void stack(
      final App app, final String name, final Kind kind, final String description) {
    new EtiyaStack(
        app,
        name,
        kind,
        StackProps.builder()
            .description(description)
            .env(
                Environment.builder()
                    .account(System.getenv("CDK_DEFAULT_ACCOUNT"))
                    .region(System.getenv("CDK_DEFAULT_REGION"))
                    .build())
            .build());
  }
}
