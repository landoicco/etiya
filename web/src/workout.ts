import { ulid } from "ulid";
import type { GymSet, WeightUnit } from "./api";

// The workout being logged, as it lives on the phone. Its shape follows the API's so that
// finishing it is little more than adding endedAt, and it is what gets saved to IndexedDB
export interface ActiveWorkout {
  // Generated here, once. The send is safe to retry because every attempt carries it
  id: string;
  // ISO-8601 with the phone's offset; the API normalizes it to UTC
  startedAt: string;
  gymId: string | null;
  gymName: string | null;
  exercises: LoggedExercise[];
  // The exercise the set logger writes to, -1 while the workout has none
  currentExerciseIndex: number;
}

export interface LoggedExercise {
  // null for an exercise typed while offline, which is not in the catalog
  exerciseCatalogItemId: string | null;
  name: string;
  sets: GymSet[];
}

// What the picker returns: an exercise chosen from the catalog, or just a name
export interface ExerciseChoice {
  exerciseCatalogItemId: string | null;
  name: string;
}

// What the first set of a workout suggests, before there is anything to inherit from
const FIRST_SET: GymSet = { count: 10, weight: 0, unit: "KG" };

// One tap on the stepper moves the weight by the smallest pair of plates in a gym
const WEIGHT_STEP: Record<WeightUnit, number> = { KG: 2.5, LB: 5, NONE: 0 };

// What the unit toggle shows, in the order it shows them: a set with no weight counts reps
// and nothing else
export const WEIGHT_UNITS: WeightUnit[] = ["KG", "LB", "NONE"];
export const UNIT_LABELS: Record<WeightUnit, string> = { KG: "kg", LB: "lb", NONE: "reps" };

// Nobody logs 1000 reps or lifts 10 tonnes; a stepper held down should still stop somewhere
const MAX_COUNT = 999;
const MAX_WEIGHT = 9999;

export function startWorkout(now: Date): ActiveWorkout {
  return {
    // The server keeps the random part and re-stamps the time from startedAt, so a retry
    // of this same workout always lands on the same stored id
    id: ulid(now.getTime()),
    startedAt: now.toISOString(),
    gymId: null,
    gymName: null,
    exercises: [],
    currentExerciseIndex: -1,
  };
}

// Picking an exercise already in the workout returns to it instead of adding it twice,
// which is how a superset is logged: tap A, tap B, tap A again
export function addExercise(workout: ActiveWorkout, choice: ExerciseChoice): ActiveWorkout {
  const existing = workout.exercises.findIndex((exercise) => isSame(exercise, choice));
  if (existing !== -1) {
    return selectExercise(workout, existing);
  }
  return {
    ...workout,
    exercises: [...workout.exercises, { ...choice, sets: [] }],
    currentExerciseIndex: workout.exercises.length,
  };
}

export function selectExercise(workout: ActiveWorkout, index: number): ActiveWorkout {
  if (index < 0 || index >= workout.exercises.length) {
    return workout;
  }
  return { ...workout, currentExerciseIndex: index };
}

export function currentExercise(workout: ActiveWorkout): LoggedExercise | null {
  return workout.exercises[workout.currentExerciseIndex] ?? null;
}

export function logSet(workout: ActiveWorkout, set: GymSet): ActiveWorkout {
  const current = currentExercise(workout);
  if (current === null) {
    return workout;
  }
  return replaceCurrent(workout, { ...current, sets: [...current.sets, normalize(set)] });
}

// Undoes within the current exercise, which is where the last set was logged unless the
// user moved on; the exercise itself stays, so its place in the list does not shift
export function undoLastSet(workout: ActiveWorkout): ActiveWorkout {
  const current = currentExercise(workout);
  if (current === null || current.sets.length === 0) {
    return workout;
  }
  return replaceCurrent(workout, { ...current, sets: current.sets.slice(0, -1) });
}

// What the set logger opens with: the same set again, since sets repeat far more often
// than they change. A new exercise starts from the unit already in use in this workout
export function nextSet(workout: ActiveWorkout): GymSet {
  const previous = currentExercise(workout)?.sets.at(-1);
  return previous ? { ...previous } : { ...FIRST_SET, unit: lastWeightedUnit(workout) };
}

export function stepCount(set: GymSet, taps: number): GymSet {
  return withCount(set, set.count + taps);
}

export function stepWeight(set: GymSet, taps: number): GymSet {
  return withWeight(set, set.weight + taps * WEIGHT_STEP[set.unit]);
}

// What a number typed on the keypad becomes, put through the same limits as the steppers
// so the two ways of setting a set cannot disagree
export function withCount(set: GymSet, count: number): GymSet {
  return { ...set, count: clamp(Math.round(count), 1, MAX_COUNT) };
}

export function withWeight(set: GymSet, weight: number): GymSet {
  // Two decimals: the smallest plate in a gym is 1.25 kg, and nothing finer is worth storing
  const rounded = Math.round(weight * 100) / 100;
  return normalize({ ...set, weight: clamp(rounded, 0, MAX_WEIGHT) });
}

export function setUnit(set: GymSet, unit: WeightUnit): GymSet {
  return normalize({ ...set, unit });
}

export function hasWeight(unit: WeightUnit): boolean {
  return unit !== "NONE";
}

// How a logged set reads in the exercise list: "12 × 60 kg", or "8 reps" without weight
export function setLabel(set: GymSet): string {
  const unit = UNIT_LABELS[set.unit];
  return hasWeight(set.unit) ? `${set.count} × ${set.weight} ${unit}` : `${set.count} ${unit}`;
}

// The elapsed time on the workout screen: h:mm:ss once past the hour, m:ss before it
export function elapsedLabel(workout: ActiveWorkout, now: Date): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - Date.parse(workout.startedAt)) / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const tail = `${pad(minutes % 60)}:${pad(seconds % 60)}`;
  return hours > 0 ? `${hours}:${tail}` : `${minutes}:${pad(seconds % 60)}`;
}

// The catalog id identifies an exercise; two offline ones are the same when they were
// typed the same way, whatever the capitalization
function isSame(exercise: LoggedExercise, choice: ExerciseChoice): boolean {
  if (exercise.exerciseCatalogItemId !== null || choice.exerciseCatalogItemId !== null) {
    return exercise.exerciseCatalogItemId === choice.exerciseCatalogItemId;
  }
  return exercise.name.trim().toLowerCase() === choice.name.trim().toLowerCase();
}

function replaceCurrent(workout: ActiveWorkout, exercise: LoggedExercise): ActiveWorkout {
  const exercises = [...workout.exercises];
  exercises[workout.currentExerciseIndex] = exercise;
  return { ...workout, exercises };
}

// The API rejects a weight on a set logged without one, so the field follows the unit
function normalize(set: GymSet): GymSet {
  return hasWeight(set.unit) ? set : { ...set, weight: 0 };
}

// Pull-ups in the middle of a session say nothing about the next exercise's unit, so they
// are skipped: what carries over is the last kilos or pounds seen
function lastWeightedUnit(workout: ActiveWorkout): WeightUnit {
  for (const exercise of workout.exercises.toReversed()) {
    const unit = exercise.sets.findLast((set) => hasWeight(set.unit))?.unit;
    if (unit) {
      return unit;
    }
  }
  return FIRST_SET.unit;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
