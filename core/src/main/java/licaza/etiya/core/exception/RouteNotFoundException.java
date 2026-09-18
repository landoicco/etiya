package licaza.etiya.core.exception;

public class RouteNotFoundException extends BusinessException {
  public RouteNotFoundException(String message) {
    super("ROUTE_NOT_FOUND", message, 404);
  }
}
