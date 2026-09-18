package licaza.etiya.core.exception;

// Shared by every resource; the code tells clients which one, e.g. GYM_ALREADY_EXISTS
public class AlreadyExistsException extends BusinessException {
  public AlreadyExistsException(String code, String message) {
    super(code, message, 409);
  }
}
