package licaza.etiya.core.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;

@Slf4j
@Configuration
@Profile("local") // Only used for DynamoDB local on Docker
public class DynamoDbLocalInitializer {

  @Value("${etiya.dynamodb.table-name}")
  private String tableName;

  @Bean
  public CommandLineRunner initLocalTable(DynamoDbClient ddbClient) {
    return args -> {
      log.info("🔍 [DynamoDB Local] Checking database environment...");

      try {
        // List existing tables
        boolean tableExists = ddbClient.listTables().tableNames().contains(tableName);

        if (!tableExists) {
          log.info(
              "⚠️ [DynamoDB Local] Table '{}' does not exist in the Docker container.", tableName);
          log.info("🏗️ [DynamoDB Local] Starting creation process for table '{}'...", tableName);

          // Configure the request
          CreateTableRequest request =
              CreateTableRequest.builder()
                  .tableName(tableName)
                  .keySchema(
                      KeySchemaElement.builder().attributeName("id").keyType(KeyType.HASH).build())
                  .attributeDefinitions(
                      AttributeDefinition.builder()
                          .attributeName("id")
                          .attributeType(ScalarAttributeType.S)
                          .build())
                  .billingMode(BillingMode.PAY_PER_REQUEST)
                  .build();

          // Create the table
          ddbClient.createTable(request);

          log.info("✅ [DynamoDB Local] Table '{}' successfully created!", tableName);
          log.info("🚀 [DynamoDB Local] Environment is ready to receive requests.");
        } else {
          log.info("✨ [DynamoDB Local] Table '{}' already exists. Skipping creation.", tableName);
          log.info("👍 [DynamoDB Local] Connection successfully established.");
        }

      } catch (Exception e) {
        log.error(
            "❌ [DynamoDB Local] Critical error during table initialization: {}", e.getMessage());
        log.error("💡 [DynamoDB Local] Did you forget to start your Docker container beforehand?");
      }
    };
  }
}
