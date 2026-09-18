package licaza.etiya.infra;

import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.constructs.Construct;

// One stack per environment, with one construct per concern:
// Database and Auth (step 4b), Functions (4c) and Api (4d)
public class EtiyaStack extends Stack {

  private final Database database;
  private final Auth auth;
  private final Functions functions;
  private final Api api;

  public EtiyaStack(final Construct scope, final String id, final StackProps props) {
    super(scope, id, props);

    this.database = new Database(this, "Database");
    this.auth = new Auth(this, "Auth");
    this.functions = new Functions(this, "Functions", database.getWorkoutsTable());
    this.api = new Api(this, "Api", auth, functions);

    publishOutputs();
  }

  // Printed by cdk deploy: everything needed to create a user, get a token and call the API
  private void publishOutputs() {
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

  public Api getApi() {
    return api;
  }
}
