package licaza.etiya.infra;

import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.constructs.Construct;

// One stack per environment, with one construct per concern:
// Database and Auth (step 4b), Functions (4c) and Api (4d)
public class EtiyaStack extends Stack {

  private final Database database;
  private final Auth auth;
  private final Functions functions;

  public EtiyaStack(final Construct scope, final String id, final StackProps props) {
    super(scope, id, props);

    this.database = new Database(this, "Database");
    this.auth = new Auth(this, "Auth");
    this.functions = new Functions(this, "Functions", database.getWorkoutsTable());
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
}
