import type { CatalogExercise, Exercise, ExerciseCategory } from "@/platform/api";
import { identityOf } from "@/workout/workout";
import { CATEGORIES } from "./catalog";

// The split a day trained, for "Last: Push": push, pull or legs with the most sets. Core,
// cardio and other only count on a day with none of the three. Ties name every category tied,
// and exercises missing from the catalog are left out
export function dayCategory(
  exercises: Exercise[],
  catalog: CatalogExercise[],
): ExerciseCategory[] {
  const categories = new Map(catalog.map((item) => [item.id, item.category]));
  const sets = new Map<ExerciseCategory, number>();

  for (const exercise of exercises) {
    const category = categories.get(identityOf(exercise));
    if (category && exercise.sets.length > 0) {
      sets.set(category, (sets.get(category) ?? 0) + exercise.sets.length);
    }
  }

  const split = CATEGORIES.filter((category) => SPLIT.has(category) && sets.has(category));
  const candidates = split.length > 0 ? split : CATEGORIES.filter((category) => sets.has(category));
  const most = Math.max(0, ...candidates.map((category) => sets.get(category) ?? 0));
  return candidates.filter((category) => sets.get(category) === most);
}

const SPLIT = new Set<ExerciseCategory>(["PUSH", "PULL", "LEGS"]);
