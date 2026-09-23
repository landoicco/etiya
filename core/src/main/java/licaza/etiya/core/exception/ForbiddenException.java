package licaza.etiya.core.exception;

public class ForbiddenException extends BusinessException {
  public ForbiddenException(String message) {
    super("FORBIDDEN", message, 403);
  }
}
