package licaza.etiya.infra;

import software.amazon.awscdk.App;
import software.amazon.awscdk.Environment;
import software.amazon.awscdk.StackProps;
import software.amazon.awscdk.Tags;

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

    app.synth();
  }
}
