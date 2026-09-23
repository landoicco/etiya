package licaza.etiya.infra;

import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.constructs.Construct;

// One stack per environment, with one construct per concern:
// Database and Auth (step 4b), Functions (4c), Api (4d) and Web (frontend step 2)
public class EtiyaStack extends Stack {

  // What the environment is for, which decides what survives a mistake. Passed down to the
  // constructs instead of a boolean, so the call site says which environment it is building
  public enum Kind {
    // Holds real data: nothing is deleted by accident and the table can be restored
    PRODUCTION,
    // Raised to try something and destroyed afterwards; losing it costs nothing
    DISPOSABLE
  }

  private final Database database;
  private final Auth auth;
  private final Functions functions;
  // Only production serves the app from S3 and CloudFront; null in a disposable environment
  private final Web web;
  private final Api api;

  public EtiyaStack(
      final Construct scope, final String id, final Kind kind, final StackProps props) {
    super(scope, id, props);

    this.database = new Database(this, "Database", kind);
    this.auth = new Auth(this, "Auth", kind);
    this.functions = new Functions(this, "Functions", database.getWorkoutsTable());
    // A disposable environment is developed against localhost, which the API already allows,
    // so it skips the distribution: creating and destroying one costs about 15 minutes each way
    this.web = kind == Kind.PRODUCTION ? new Web(this, "Web") : null;
    // Web comes before Api, which allows its origin in CORS
    this.api = new Api(this, "Api", auth, functions, web == null ? null : web.getUrl());

    publishOutputs();
  }

  // Printed by cdk deploy: everything needed to create a user, get a token and call the API.
  // web/scripts/deploy.sh reads them too, to know where to upload and what goes in config.json
  private void publishOutputs() {
    if (web != null) {
      output("WebUrl", web.getUrl(), "The app, to open on the phone");
      output("WebBucketName", web.getBucketName(), "Bucket the web app is uploaded to");
    }
    output("ApiUrl", api.getApiUrl(), "Base URL of the HTTP API");
    output("UserPoolId", auth.getUserPool().getUserPoolId(), "Cognito user pool, to create users");
    output(
        "UserPoolClientId",
        auth.getApiClient().getUserPoolClientId(),
        "App client id, needed to request tokens");
    output("TableName", database.getWorkoutsTable().getTableName(), "DynamoDB table");
  }

  private void output(final String name, final String value, final String description) {
    CfnOutput.Builder.create(this, name).value(value).description(description).build();
  }
}
