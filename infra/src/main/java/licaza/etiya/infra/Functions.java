package licaza.etiya.infra;

import java.util.Map;
import software.amazon.awscdk.Acknowledgment;
import software.amazon.awscdk.Annotations;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.Validations;
import software.amazon.awscdk.services.dynamodb.Table;
import software.amazon.awscdk.services.lambda.Alias;
import software.amazon.awscdk.services.lambda.Code;
import software.amazon.awscdk.services.lambda.Function;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awscdk.services.lambda.SnapStartConf;
import software.amazon.awscdk.services.logs.LogGroup;
import software.amazon.awscdk.services.logs.RetentionDays;
import software.constructs.Construct;

// One Lambda per domain, all running the same jar. Each one is told which function bean to
// serve, so the handlers in core never change when the infrastructure does
public class Functions extends Construct {

  // Built beforehand with: cd core && mvn -P prod clean package
  private static final String JAR_PATH = "../core/target/core-0.0.1-SNAPSHOT-aws.jar";

  // Entry point of spring-cloud-function-adapter-aws; it boots Spring and looks up the bean
  private static final String HANDLER =
      "org.springframework.cloud.function.adapter.aws.FunctionInvoker::handleRequest";

  // Spring needs room to start; CPU scales with memory, so more memory also means a faster start
  private static final int MEMORY_MB = 1024;

  // HTTP API gives up after 30 seconds anyway
  private static final Duration TIMEOUT = Duration.seconds(30);

  private final Alias gymsApi;
  private final Alias exercisesApi;
  private final Alias workoutsApi;

  public Functions(final Construct scope, final String id, final Table table) {
    super(scope, id);

    this.gymsApi = createFunction("Gyms", "gymsApi", table);
    this.exercisesApi = createFunction("Exercises", "exercisesApi", table);
    this.workoutsApi = createFunction("Workouts", "workoutsApi", table);
  }

  // Returns the "live" alias instead of the function: SnapStart only applies to published
  // versions, so the API must invoke the alias for the snapshot to be used
  private Alias createFunction(final String name, final String functionBean, final Table table) {
    LogGroup logGroup =
        LogGroup.Builder.create(this, name + "Logs")
            // The default is to keep logs forever, which slowly grows the bill
            .retention(RetentionDays.TWO_WEEKS)
            .removalPolicy(RemovalPolicy.DESTROY)
            .build();

    Function function =
        Function.Builder.create(this, name + "Function")
            .description("Etiya " + functionBean + " routes")
            .runtime(Runtime.JAVA_21)
            .handler(HANDLER)
            .code(Code.fromAsset(JAR_PATH))
            .memorySize(MEMORY_MB)
            .timeout(TIMEOUT)
            .environment(
                Map.of(
                    "SPRING_PROFILES_ACTIVE",
                    "prod",
                    "SPRING_CLOUD_FUNCTION_DEFINITION",
                    functionBean,
                    "TABLE_NAME",
                    table.getTableName()))
            .snapStart(SnapStartConf.ON_PUBLISHED_VERSIONS)
            .logGroup(logGroup)
            .build();

    // Every domain shares the table, so each one gets read and write access to all of it.
    // Narrowing this per item type would need IAM conditions on the partition key
    table.grantReadWriteData(function);

    Validations.of(function)
        .acknowledge(
            Acknowledgment.builder()
                .id(
                    "AwsSolutions-IAM4[Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/"
                        + "AWSLambdaBasicExecutionRole]")
                .reason(
                    "Only grants writing to CloudWatch Logs. Replacing it with an inline policy"
                        + " is part of the narrower IAM item in docs/decisions.md")
                .build(),
            Acknowledgment.builder()
                .id("AwsSolutions-L1")
                .reason(
                    "Java 21 is an LTS runtime supported by Lambda. Moving to Java 25 changes the"
                        + " flake, the Docker images and the compiler release too, so it is its own"
                        + " step")
                .build());

    // The alias below publishes a version, which is what SnapStart needs; the CDK cannot tell
    Annotations.of(function)
        .acknowledgeWarning(
            "@aws-cdk/aws-lambda:snapStartRequirePublish",
            "Published through the live alias, which is what the API invokes");

    return Alias.Builder.create(this, name + "Alias")
        .aliasName("live")
        .version(function.getCurrentVersion())
        .build();
  }

  public Alias getGymsApi() {
    return gymsApi;
  }

  public Alias getExercisesApi() {
    return exercisesApi;
  }

  public Alias getWorkoutsApi() {
    return workoutsApi;
  }
}
