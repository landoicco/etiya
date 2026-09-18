package licaza.etiya.infra;

import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Stack;
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

  public Database(final Construct scope, final String id) {
    super(scope, id);

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
            // which for this data is a fraction of a cent. Deleting the table keeps a backup too
            .pointInTimeRecoverySpecification(
                PointInTimeRecoverySpecification.builder().pointInTimeRecoveryEnabled(true).build())
            // Dev environment: cdk destroy must not leave the table behind
            .removalPolicy(RemovalPolicy.DESTROY)
            .build();
  }

  public Table getWorkoutsTable() {
    return workoutsTable;
  }
}
