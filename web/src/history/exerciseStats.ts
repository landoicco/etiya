import type { GymSet, WeightUnit } from "@/platform/api";
import { identityOf } from "@/workout/workout";
import type { PastWorkout } from "./lastMonth";

// Each session's heaviest set, in the unit asked for. For a set logged without weight, it is
// the most reps instead
export interface ExerciseStats {
  unit: WeightUnit;
  max: number;
  average: number;
  sessions: number;
  // When the oldest session counted started, for "3 sessions since Sep 12"
  since: string;
}

const KG_PER_LB = 0.453_592_37;

// Whatever sessions there are since then count, even one: a new user has history from day one.
// Sets in the other kind of unit (reps when weight is asked, or the reverse) are left out
export function exerciseStats(
  workouts: PastWorkout[],
  exercise: string,
  unit: WeightUnit,
  since: Date,
): ExerciseStats | null {
  const sessions: { startedAt: string; best: number }[] = [];

  for (const workout of workouts) {
    if (Date.parse(workout.startedAt) < since.getTime()) {
      continue;
    }
    const values = workout.exercises
      .filter((logged) => identityOf(logged) === exercise)
      .flatMap((logged) => logged.sets)
      .filter((set) => (set.unit === "NONE") === (unit === "NONE"))
      .map((set) => valueOf(set, unit));
    if (values.length > 0) {
      sessions.push({ startedAt: workout.startedAt, best: Math.max(...values) });
    }
  }

  if (sessions.length === 0) {
    return null;
  }

  const bests = sessions.map((session) => session.best);
  const oldest = sessions.reduce((a, b) => (Date.parse(a.startedAt) <= Date.parse(b.startedAt) ? a : b));
  return {
    unit,
    max: round(Math.max(...bests)),
    average: round(bests.reduce((total, best) => total + best, 0) / bests.length),
    sessions: sessions.length,
    since: oldest.startedAt,
  };
}

function valueOf(set: GymSet, unit: WeightUnit): number {
  if (unit === "NONE") {
    return set.count;
  }
  if (set.unit === unit) {
    return set.weight;
  }
  return unit === "KG" ? set.weight * KG_PER_LB : set.weight / KG_PER_LB;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
