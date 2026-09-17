package licaza.etiya.infra;

import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;
import software.constructs.Construct;

// One stack per environment, with one construct per concern:
// Database and Auth (step 4b), Functions (4c) and Api (4d)
public class EtiyaStack extends Stack {

  public EtiyaStack(final Construct scope, final String id, final StackProps props) {
    super(scope, id, props);
  }
}
