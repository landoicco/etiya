package licaza.etiya.infra;

import io.github.cdklabs.cdknag.AwsSolutionsChecks;
import software.amazon.awscdk.App;
import software.amazon.awscdk.Environment;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.Tags;
import software.amazon.awscdk.Validations;

public final class EtiyaApp {

  public static void main(final String[] args) {
    App app = new App();

    // Only a dev environment for now; the stack name leaves room for an "EtiyaProd" later.
    // Account and region come from the AWS CLI profile used to run cdk
    new EtiyaStack(
        app,
        "EtiyaDev",
        StackProps.builder()
            .description("Etiya gym tracker - dev environment")
            .env(
                Environment.builder()
                    .account(System.getenv("CDK_DEFAULT_ACCOUNT"))
                    .region(System.getenv("CDK_DEFAULT_REGION"))
                    .build())
            .build());

    // Lets every resource be filtered by project in Cost Explorer
    Tags.of(app).add("project", "etiya");

    // Fails the synth on any finding that is neither fixed nor acknowledged with a reason
    Validations.of(app).addPlugins(new AwsSolutionsChecks(app));

    app.synth();
  }
}
