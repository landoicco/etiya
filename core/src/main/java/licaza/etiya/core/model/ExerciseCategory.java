package licaza.etiya.core.model;

// How the app groups and filters the catalog, after the push/pull/legs split. Stored per
// exercise instead of derived from the muscle group, which is ambiguous: shoulders cover both
// presses (push) and rear delt flyes (pull). CARDIO is its own value; OTHER covers the rest,
// like sport-specific drills
public enum ExerciseCategory {
  PUSH,
  PULL,
  LEGS,
  CORE,
  CARDIO,
  OTHER
}
