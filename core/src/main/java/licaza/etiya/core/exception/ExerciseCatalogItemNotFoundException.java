package licaza.etiya.core.exception;

public class ExerciseCatalogItemNotFoundException extends BusinessException {
  public ExerciseCatalogItemNotFoundException(String message) {
    super("EXERCISE_NOT_FOUND", message, 404);
  }
}
