import type { GymSet, WeightUnit } from "@/platform/api";
import { identityOf } from "@/workout/workout";
import type { PastWorkout } from "./lastMonth";

// Each session's heaviest set, as logged. For a set logged without weight, it is the most reps
export interface SessionBest {
  startedAt: string;
  set: GymSet;
}

// max and average are in the unit asked for; sessions are newest first
export interface ExerciseStats {
  unit: WeightUnit;
  max: number;
  average: number;
  sessions: SessionBest[];
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
  const sessions: (SessionBest & { value: number })[] = [];

  for (const workout of workouts) {
    if (Date.parse(workout.startedAt) < since.getTime()) {
      continue;
    }
    const best = setsOf(workout, exercise)
      .filter((set) => (set.unit === "NONE") === (unit === "NONE"))
      .map((set) => ({ set, value: valueOf(set, unit) }))
      .reduce<{ set: GymSet; value: number } | null>(
        (heaviest, candidate) => (heaviest && heaviest.value >= candidate.value ? heaviest : candidate),
        null,
      );
    if (best) {
      sessions.push({ startedAt: workout.startedAt, ...best });
    }
  }

  if (sessions.length === 0) {
    return null;
  }

  const values = sessions.map((session) => session.value);
  return {
    unit,
    max: round(Math.max(...values)),
    average: round(values.reduce((total, value) => total + value, 0) / values.length),
    sessions: sessions
      .toSorted((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
      .map(({ startedAt, set }) => ({ startedAt, set })),
  };
}

// The unit the exercise was last logged in, so the stats read the way it is usually done
export function lastUnit(workouts: PastWorkout[], exercise: string): WeightUnit | null {
  const latest = workouts
    .filter((workout) => setsOf(workout, exercise).length > 0)
    .toSorted((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];
  return latest ? (setsOf(latest, exercise).at(-1)?.unit ?? null) : null;
}

function setsOf(workout: PastWorkout, exercise: string): GymSet[] {
  return workout.exercises
    .filter((logged) => identityOf(logged) === exercise)
    .flatMap((logged) => logged.sets);
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
