package licaza.etiya.core.exception;

public class WorkoutNotFoundException extends BusinessException {
  public WorkoutNotFoundException(String message) {
    super("WORKOUT_NOT_FOUND", message, 404);
  }
}
