package licaza.etiya.core.model;

// The push/pull/legs split the app filters by. Stored, not derived from the muscle group:
// shoulders cover both presses (push) and rear delt flyes (pull)
public enum ExerciseCategory {
  PUSH,
  PULL,
  LEGS,
  CORE,
  CARDIO,
  OTHER
}
