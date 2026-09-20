package licaza.etiya.core.model;

// A fixed list, since every user writes to the shared catalog: free text would end up with
// "chest", "Chest" and "Pecho" as three different groups. The app shows its own labels
public enum MuscleGroup {
  CHEST,
  BACK,
  SHOULDERS,
  BICEPS,
  TRICEPS,
  FOREARMS,
  QUADS,
  HAMSTRINGS,
  GLUTES,
  CALVES,
  CORE,
  FULL_BODY
}
