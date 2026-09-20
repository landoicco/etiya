import { describe, expect, it } from "vitest";
import type { GymSet } from "./api";
import {
  addExercise,
  currentExercise,
  elapsedLabel,
  logSet,
  nextSet,
  selectExercise,
  setLabel,
  setUnit,
  startWorkout,
  stepCount,
  stepWeight,
  undoLastSet,
  withCount,
  withWeight,
  type ActiveWorkout,
} from "./workout";

const START = new Date("2026-09-19T18:30:00.000Z");

const BENCH = { exerciseCatalogItemId: "barbell-bench-press", name: "Barbell Bench Press" };
const SQUAT = { exerciseCatalogItemId: "barbell-squat", name: "Barbell Squat" };
const PULL_UP = { exerciseCatalogItemId: "pull-up", name: "Pull Up" };

function kg(count: number, weight: number): GymSet {
  return { count, weight, unit: "KG" };
}

// A workout with the given sets logged on the given exercise, left as the current one
function workoutWith(...sets: GymSet[]): ActiveWorkout {
  const started = addExercise(startWorkout(START, null), BENCH);
  return sets.reduce(logSet, started);
}

describe("startWorkout", () => {
  it("stamps the id with the start time, so a retry lands on the same workout", () => {
    const workout = startWorkout(START, null);

    expect(workout.id).toHaveLength(26);
    expect(workout.id.slice(0, 10)).toBe(startWorkout(START, null).id.slice(0, 10));
    expect(workout.startedAt).toBe("2026-09-19T18:30:00.000Z");
  });

  it("carries the gym it was started at, and none when there is none", () => {
    const gym = { id: "smart-fit-valle-oriente-monterrey", name: "Smart Fit Valle Oriente" };

    expect(startWorkout(START, gym)).toMatchObject({
      gymId: "smart-fit-valle-oriente-monterrey",
      gymName: "Smart Fit Valle Oriente",
    });
    expect(startWorkout(START, null)).toMatchObject({ gymId: null, gymName: null });
  });

  it("starts empty, with nothing to log sets on", () => {
    const workout = startWorkout(START, null);

    expect(workout.exercises).toEqual([]);
    expect(currentExercise(workout)).toBeNull();
    expect(logSet(workout, kg(10, 60))).toBe(workout);
    expect(undoLastSet(workout)).toBe(workout);
  });
});

describe("addExercise", () => {
  it("appends the exercise and makes it the current one", () => {
    const workout = addExercise(addExercise(startWorkout(START, null), BENCH), SQUAT);

    expect(workout.exercises.map((exercise) => exercise.name)).toEqual([
      "Barbell Bench Press",
      "Barbell Squat",
    ]);
    expect(currentExercise(workout)?.name).toBe("Barbell Squat");
  });

  it("returns to an exercise already in the workout instead of adding it twice", () => {
    const both = addExercise(addExercise(startWorkout(START, null), BENCH), SQUAT);
    const superset = addExercise(both, BENCH);

    expect(superset.exercises).toHaveLength(2);
    expect(superset.currentExerciseIndex).toBe(0);
  });

  it("matches exercises typed offline by name, whatever the capitalization", () => {
    const row = { exerciseCatalogItemId: null, name: "Row" };
    const typed = addExercise(startWorkout(START, null), row);
    const again = addExercise(typed, { exerciseCatalogItemId: null, name: " row " });

    expect(again.exercises).toHaveLength(1);
  });

  it("keeps an exercise from the catalog apart from one typed with the same name", () => {
    const byName = { exerciseCatalogItemId: null, name: "Pull Up" };
    const typed = addExercise(startWorkout(START, null), byName);

    expect(addExercise(typed, PULL_UP).exercises).toHaveLength(2);
  });
});

describe("selectExercise", () => {
  it("moves the set logger to another exercise", () => {
    const workout = addExercise(addExercise(startWorkout(START, null), BENCH), SQUAT);

    expect(currentExercise(selectExercise(workout, 0))?.name).toBe("Barbell Bench Press");
  });

  it("ignores an index the workout does not have", () => {
    const workout = addExercise(startWorkout(START, null), BENCH);

    expect(selectExercise(workout, 1)).toBe(workout);
    expect(selectExercise(workout, -1)).toBe(workout);
  });
});

describe("logSet and undoLastSet", () => {
  it("logs sets in order on the current exercise", () => {
    const workout = workoutWith(kg(12, 60), kg(10, 80));

    expect(currentExercise(workout)?.sets).toEqual([kg(12, 60), kg(10, 80)]);
  });

  it("drops the weight of a set logged without one", () => {
    const workout = workoutWith({ count: 8, weight: 60, unit: "NONE" });

    expect(currentExercise(workout)?.sets).toEqual([{ count: 8, weight: 0, unit: "NONE" }]);
  });

  it("undoes the last set and leaves the exercise in place", () => {
    const workout = undoLastSet(workoutWith(kg(12, 60), kg(10, 80)));

    expect(currentExercise(workout)?.sets).toEqual([kg(12, 60)]);
    expect(undoLastSet(workout).exercises).toHaveLength(1);
    expect(currentExercise(undoLastSet(workout))?.sets).toEqual([]);
  });

  it("does nothing once the current exercise has no sets left", () => {
    const empty = addExercise(startWorkout(START, null), BENCH);

    expect(undoLastSet(empty)).toBe(empty);
  });

  it("leaves the other exercises untouched", () => {
    const first = workoutWith(kg(12, 60));
    const second = logSet(addExercise(first, SQUAT), kg(5, 100));

    expect(second.exercises[0]?.sets).toEqual([kg(12, 60)]);
    expect(undoLastSet(second).exercises[0]?.sets).toEqual([kg(12, 60)]);
  });
});

describe("nextSet", () => {
  it("suggests ten reps of nothing for the very first set", () => {
    expect(nextSet(addExercise(startWorkout(START, null), BENCH))).toEqual(kg(10, 0));
  });

  it("repeats the previous set of the exercise", () => {
    expect(nextSet(workoutWith(kg(12, 60), kg(10, 80)))).toEqual(kg(10, 80));
  });

  it("carries the unit already in use over to a new exercise", () => {
    const pounds = logSet(addExercise(startWorkout(START, null), BENCH), {
      count: 12,
      weight: 135,
      unit: "LB",
    });

    expect(nextSet(addExercise(pounds, SQUAT))).toEqual({ count: 10, weight: 0, unit: "LB" });
  });

  it("does not carry over a set logged without weight", () => {
    const pullUps = logSet(addExercise(workoutWith(kg(12, 60)), PULL_UP), {
      count: 8,
      weight: 0,
      unit: "NONE",
    });

    expect(nextSet(addExercise(pullUps, SQUAT))).toEqual(kg(10, 0));
  });
});

describe("steppers", () => {
  it("moves reps one at a time and never below one", () => {
    expect(stepCount(kg(10, 60), 1)).toEqual(kg(11, 60));
    expect(stepCount(kg(1, 60), -1)).toEqual(kg(1, 60));
  });

  it("moves kilos by 2.5 and pounds by 5", () => {
    expect(stepWeight(kg(10, 60), 1).weight).toBe(62.5);
    expect(stepWeight({ count: 10, weight: 135, unit: "LB" }, -1).weight).toBe(130);
  });

  it("never goes below an empty bar", () => {
    expect(stepWeight(kg(10, 2), -1).weight).toBe(0);
  });

  it("leaves a set without weight alone", () => {
    const set: GymSet = { count: 8, weight: 0, unit: "NONE" };

    expect(stepWeight(set, 5)).toEqual(set);
  });

  it("puts a typed number through the same limits", () => {
    expect(withCount(kg(10, 60), 12)).toEqual(kg(12, 60));
    expect(withWeight(kg(10, 60), 102.5)).toEqual(kg(10, 102.5));
  });

  it("rounds a typed number to whole reps and two decimals of weight", () => {
    expect(withCount(kg(10, 60), 12.6).count).toBe(13);
    expect(withWeight(kg(10, 60), 60.129).weight).toBe(60.13);
  });

  it("clamps a typed number that is out of range or negative", () => {
    expect(withCount(kg(10, 60), 0).count).toBe(1);
    expect(withCount(kg(10, 60), 4000).count).toBe(999);
    expect(withWeight(kg(10, 60), -20).weight).toBe(0);
    expect(withWeight(kg(10, 60), 50_000).weight).toBe(9999);
  });

  it("refuses a typed weight on a set logged without one", () => {
    expect(withWeight({ count: 8, weight: 0, unit: "NONE" }, 60).weight).toBe(0);
  });

  it("clears the weight when the set stops having one, and keeps the reps", () => {
    expect(setUnit(kg(12, 60), "NONE")).toEqual({ count: 12, weight: 0, unit: "NONE" });
    expect(setUnit(kg(12, 60), "LB")).toEqual({ count: 12, weight: 60, unit: "LB" });
  });
});

describe("setLabel", () => {
  it("reads as reps by weight, and drops the weight when there is none", () => {
    expect(setLabel(kg(12, 62.5))).toBe("12 × 62.5 kg");
    expect(setLabel({ count: 10, weight: 135, unit: "LB" })).toBe("10 × 135 lb");
    expect(setLabel({ count: 8, weight: 0, unit: "NONE" })).toBe("8 reps");
  });
});

describe("elapsedLabel", () => {
  it("counts minutes and seconds, and adds hours once past one", () => {
    const at = (minutes: number, seconds = 0) =>
      elapsedLabel(startWorkout(START, null), new Date(START.getTime() + (minutes * 60 + seconds) * 1000));

    expect(at(0, 7)).toBe("0:07");
    expect(at(9, 5)).toBe("9:05");
    expect(at(75, 42)).toBe("1:15:42");
  });

  it("shows zero while the phone's clock catches up", () => {
    expect(elapsedLabel(startWorkout(START, null), new Date(START.getTime() - 5000))).toBe("0:00");
  });
});
