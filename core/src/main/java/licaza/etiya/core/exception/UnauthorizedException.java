package licaza.etiya.core.exception;

public class UnauthorizedException extends BusinessException {
  public UnauthorizedException(String message) {
    super("UNAUTHORIZED", message, 401);
  }
}
