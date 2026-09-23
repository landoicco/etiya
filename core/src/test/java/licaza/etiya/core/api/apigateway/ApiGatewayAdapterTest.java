package licaza.etiya.core.api.apigateway;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ApiGatewayAdapterTest {

  // How the HTTP API passes a token's array claim to the Lambda
  @Test
  void readsGroupsTheWayTheHttpApiWritesThem() {
    assertThat(ApiGatewayAdapter.groupsFrom("[admins]")).containsExactly("admins");
    assertThat(ApiGatewayAdapter.groupsFrom("[admins testers]"))
        .containsExactlyInAnyOrder("admins", "testers");
  }

  // Tolerated in case the format ever shows up as JSON or comma-separated
  @ParameterizedTest
  @ValueSource(strings = {"[\"admins\",\"testers\"]", "admins,testers", "admins, testers"})
  void readsOtherListFormatsToo(String claim) {
    assertThat(ApiGatewayAdapter.groupsFrom(claim)).containsExactlyInAnyOrder("admins", "testers");
  }

  @ParameterizedTest
  @ValueSource(strings = {"", "[]", "  "})
  void anEmptyClaimMeansNoGroups(String claim) {
    assertThat(ApiGatewayAdapter.groupsFrom(claim)).isEmpty();
  }

  @Test
  void noClaimMeansNoGroups() {
    assertThat(ApiGatewayAdapter.groupsFrom(null)).isEmpty();
  }
}
