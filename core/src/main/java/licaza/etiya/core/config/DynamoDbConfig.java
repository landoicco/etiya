package licaza.etiya.core.config;

import java.net.URI;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;

@Slf4j
@Configuration
public class DynamoDbConfig {

  @Bean
  @Profile("local")
  public DynamoDbClient localDynamoDbClient(
      @Value("${aws.dynamodb.endpoint}") String endpoint,
      @Value("${aws.region:us-east-1}") String region) {
    log.info("🔌 Connecting to local DynamoDB (Docker)...");
    return DynamoDbClient.builder()
        .endpointOverride(URI.create(endpoint))
        .region(Region.of(region))
        .credentialsProvider(
            StaticCredentialsProvider.create(AwsBasicCredentials.create("local", "local")))
        .build();
  }

  @Bean
  @Profile("prod")
  public DynamoDbClient awsDynamoDbClient() {
    log.info("☁️ Connecting to DynamoDB in AWS...");
    return DynamoDbClient.builder().build();
  }

  @Bean
  public DynamoDbEnhancedClient dynamoDbEnhancedClient(DynamoDbClient client) {
    return DynamoDbEnhancedClient.builder().dynamoDbClient(client).build();
  }
}
