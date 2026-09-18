package licaza.etiya.core.api;

public record ApiResponse(int statusCode, Object body) {

  public static ApiResponse ok(Object body) {
    return new ApiResponse(200, body);
  }

  public static ApiResponse created(Object body) {
    return new ApiResponse(201, body);
  }
}
