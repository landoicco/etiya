package licaza.etiya.core.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Set;
import licaza.etiya.core.exception.ForbiddenException;
import licaza.etiya.core.exception.UnauthorizedException;
import org.junit.jupiter.api.Test;

class ApiRequestTest {

  @Test
  void aMemberOfTheGroupGetsThrough() {
    assertThat(request("user-123", Set.of("admins")).requireGroup("admins")).isEqualTo("user-123");
  }

  @Test
  void somebodyOutsideTheGroupIsForbidden() {
    assertThatThrownBy(() -> request("user-123", Set.of("testers")).requireGroup("admins"))
        .isInstanceOf(ForbiddenException.class);
    assertThatThrownBy(() -> request("user-123", null).requireGroup("admins"))
        .isInstanceOf(ForbiddenException.class);
  }

  // Nobody signed in is a 401, not a 403, even when a group claim is somehow present
  @Test
  void nobodyIsUnauthorizedBeforeBeingForbidden() {
    assertThatThrownBy(() -> request(null, Set.of("admins")).requireGroup("admins"))
        .isInstanceOf(UnauthorizedException.class);
  }

  private static ApiRequest request(String userId, Set<String> groups) {
    return new ApiRequest(
        "POST /catalog/exercises", "/catalog/exercises", null, null, "{}", userId, groups);
  }
}
