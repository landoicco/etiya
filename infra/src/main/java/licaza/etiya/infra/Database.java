package licaza.etiya.infra;

import licaza.etiya.infra.EtiyaStack.Kind;
import software.amazon.awscdk.Acknowledgment;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.Validations;
import software.amazon.awscdk.services.dynamodb.Attribute;
import software.amazon.awscdk.services.dynamodb.AttributeType;
import software.amazon.awscdk.services.dynamodb.BillingMode;
import software.amazon.awscdk.services.dynamodb.PointInTimeRecoverySpecification;
import software.amazon.awscdk.services.dynamodb.Table;
import software.constructs.Construct;

// Single table for gyms, exercises and workouts.
// Keys must stay in sync with TableSchemaFactory and DynamoDbLocalInitializer in core
public class Database extends Construct {

  private static final String PARTITION_KEY = "PK";
  private static final String SORT_KEY = "SK";

  // The always free tier covers 25 read and 25 write units per region, so this stays at $0.
  // On-demand would be simpler but is billed per request from the first one
  private static final int READ_CAPACITY = 5;
  private static final int WRITE_CAPACITY = 5;

  private final Table workoutsTable;

  public Database(final Construct scope, final String id, final Kind kind) {
    super(scope, id);

    boolean production = kind == Kind.PRODUCTION;

    this.workoutsTable =
        Table.Builder.create(this, "WorkoutsTable")
            .tableName(Stack.of(this).getStackName() + "-Workouts")
            .partitionKey(
                Attribute.builder().name(PARTITION_KEY).type(AttributeType.STRING).build())
            .sortKey(Attribute.builder().name(SORT_KEY).type(AttributeType.STRING).build())
            .billingMode(BillingMode.PROVISIONED)
            .readCapacity(READ_CAPACITY)
            .writeCapacity(WRITE_CAPACITY)
            // Restores the table to any second of the last 35 days. Billed per GB of table size,
            // which for this data is a fraction of a cent. Deleting the table keeps a backup too.
            // A disposable environment holds nothing worth restoring, so it does not pay for it
            .pointInTimeRecoverySpecification(
                PointInTimeRecoverySpecification.builder()
                    .pointInTimeRecoveryEnabled(production)
                    .build())
            // Refuses a DeleteTable call outright, whoever makes it, CloudFormation included
            .deletionProtection(production)
            // Production keeps the table even if the stack goes; a dev destroy leaves nothing
            .removalPolicy(production ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY)
            .build();

    // Only here: production keeps point-in-time recovery, and this check is what makes sure
    // of it. Acknowledging it for the whole app would hide the day prod silently loses it
    if (!production) {
      Validations.of(workoutsTable)
          .acknowledge(
              Acknowledgment.builder()
                  .id("AwsSolutions-DDB3")
                  .reason(
                      "A disposable environment is thrown away on purpose and holds only test"
                          + " data, so paying to restore it to any second would buy nothing")
                  .build());
    }
  }

  public Table getWorkoutsTable() {
    return workoutsTable;
  }
}
