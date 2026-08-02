package licaza.etiya.core.exception;

public class GymNotFoundException extends BusinessException {
  public GymNotFoundException(String message) {
    super("GYM_NOT_FOUND", message, 404);
  }
}
