package licaza.etiya.infra;

import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.constructs.Construct;

// One stack per environment, with one construct per concern:
// Database and Auth (step 4b), Functions (4c), Api (4d) and Web (frontend step 2)
public class EtiyaStack extends Stack {

  private final Database database;
  private final Auth auth;
  private final Functions functions;
  private final Web web;
  private final Api api;

  public EtiyaStack(final Construct scope, final String id, final StackProps props) {
    super(scope, id, props);

    this.database = new Database(this, "Database");
    this.auth = new Auth(this, "Auth");
    this.functions = new Functions(this, "Functions", database.getWorkoutsTable());
    // Web comes before Api, which allows its origin in CORS
    this.web = new Web(this, "Web");
    this.api = new Api(this, "Api", auth, functions, web.getUrl());

    publishOutputs();
  }

  // Printed by cdk deploy: everything needed to create a user, get a token and call the API.
  // web/scripts/deploy.sh reads them too, to know where to upload and what goes in config.json
  private void publishOutputs() {
    output("WebUrl", web.getUrl(), "The app, to open on the phone");
    output("WebBucketName", web.getBucketName(), "Bucket the web app is uploaded to");
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

  public Database getDatabase() {
    return database;
  }

  public Auth getAuth() {
    return auth;
  }

  public Functions getFunctions() {
    return functions;
  }

  public Web getWeb() {
    return web;
  }

  public Api getApi() {
    return api;
  }
}
