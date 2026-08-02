package licaza.etiya.core.exception;

public class InputValidationException extends BusinessException {
  public InputValidationException(String message) {
    super("VALIDATION_ERROR", message, 400);
  }
}
