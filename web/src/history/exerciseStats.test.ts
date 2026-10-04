import { describe, expect, it } from "vitest";
import type { Exercise, GymSet } from "@/platform/api";
import { exerciseStats } from "./exerciseStats";
import type { PastWorkout } from "./lastMonth";

const SINCE = new Date("2026-09-04T12:00:00Z");
const BENCH = "barbell-bench-press";

function session(startedAt: string, ...exercises: Exercise[]): PastWorkout {
  return { id: startedAt, startedAt, exercises };
}

function bench(...sets: GymSet[]): Exercise {
  return { exerciseCatalogItemId: BENCH, name: "Barbell Bench Press", sets };
}

function kg(weight: number, count = 8): GymSet {
  return { count, weight, unit: "KG" };
}

function pullUp(...counts: number[]): Exercise {
  return {
    exerciseCatalogItemId: "pull-up",
    name: "Pull-Up",
    sets: counts.map((count) => ({ count, weight: 0, unit: "NONE" })),
  };
}

describe("exerciseStats", () => {
  it("averages each session's heaviest set and keeps the heaviest of all", () => {
    const workouts = [
      session("2026-09-26T18:00:00Z", bench(kg(60), kg(62.5, 6))),
      session("2026-09-19T18:00:00Z", bench(kg(65, 5), kg(60))),
      session("2026-09-12T18:00:00Z", bench(kg(60))),
    ];

    expect(exerciseStats(workouts, BENCH, "KG", SINCE)).toEqual({
      unit: "KG",
      max: 65,
      average: 62.5,
      sessions: 3,
      since: "2026-09-12T18:00:00Z",
    });
  });

  it("works from a single session, for a user who just started", () => {
    const stats = exerciseStats([session("2026-10-01T18:00:00Z", bench(kg(40)))], BENCH, "KG", SINCE);

    expect(stats).toMatchObject({ max: 40, average: 40, sessions: 1 });
  });

  it("is null when the exercise was not trained since then", () => {
    const workouts = [session("2026-08-20T18:00:00Z", bench(kg(60)))];

    expect(exerciseStats(workouts, BENCH, "KG", SINCE)).toBeNull();
  });

  it("converts sets logged in the other unit, to one decimal", () => {
    const workouts = [
      session("2026-09-26T18:00:00Z", bench({ count: 8, weight: 135, unit: "LB" })),
      session("2026-09-19T18:00:00Z", bench(kg(60))),
    ];

    expect(exerciseStats(workouts, BENCH, "KG", SINCE)).toMatchObject({ max: 61.2, average: 60.6 });
    expect(exerciseStats(workouts, BENCH, "LB", SINCE)).toMatchObject({ max: 135, average: 133.6 });
  });

  it("counts reps for an exercise done without weight", () => {
    const workouts = [
      session("2026-09-26T18:00:00Z", pullUp(10, 8)),
      session("2026-09-19T18:00:00Z", pullUp(7, 7)),
    ];

    expect(exerciseStats(workouts, "pull-up", "NONE", SINCE)).toMatchObject({
      unit: "NONE",
      max: 10,
      average: 8.5,
    });
  });

  it("leaves out sets of the other kind, reps when weight is asked", () => {
    const workouts = [
      session("2026-09-26T18:00:00Z", bench({ count: 20, weight: 0, unit: "NONE" })),
      session("2026-09-19T18:00:00Z", bench(kg(60))),
    ];

    expect(exerciseStats(workouts, BENCH, "KG", SINCE)).toMatchObject({ sessions: 1, max: 60 });
  });

  it("matches an exercise typed offline with the one from the catalog", () => {
    const offline: Exercise = { exerciseCatalogItemId: null, name: "Barbell Bench Press", sets: [kg(70)] };
    const workouts = [session("2026-09-26T18:00:00Z", offline), session("2026-09-19T18:00:00Z", bench(kg(60)))];

    expect(exerciseStats(workouts, BENCH, "KG", SINCE)).toMatchObject({ sessions: 2, max: 70 });
  });
});
