import { describe, expect, it } from "vitest";
import type { Workout } from "./api";
import { durationLabel, minutesOf, summaryLine, totalSets } from "./workouts";

// Only the times, the gym and the sets are read here, so the rest stays out of the way
function workout(minutes: number, gymName: string | null, ...sets: number[]): Workout {
  const started = Date.parse("2026-09-19T18:30:00Z");

  return {
    id: "01KZ8BHKC0N761RDSJY0HMX246",
    userId: "user-1",
    startedAt: new Date(started).toISOString(),
    endedAt: new Date(started + minutes * 60_000).toISOString(),
    gymId: gymName === null ? null : "a-gym",
    gymName,
    exercises: sets.map((count, index) => ({
      exerciseCatalogItemId: null,
      name: `Exercise ${index}`,
      sets: Array.from({ length: count }, () => ({ count: 10, weight: 60, unit: "KG" as const })),
    })),
  };
}

describe("durationLabel", () => {
  it("counts minutes up to an hour", () => {
    expect(durationLabel(workout(45, null))).toBe("45 min");
    expect(durationLabel(workout(59, null))).toBe("59 min");
  });

  // "95 min" reads as arithmetic rather than as a length of time
  it("splits hours and minutes past the hour", () => {
    expect(durationLabel(workout(60, null))).toBe("1 h");
    expect(durationLabel(workout(75, null))).toBe("1 h 15 min");
    expect(durationLabel(workout(120, null))).toBe("2 h");
  });

  it("rounds to the nearest minute", () => {
    expect(minutesOf(workout(0.4, null))).toBe(0);
    expect(minutesOf(workout(0.6, null))).toBe(1);
  });
});

describe("summaryLine", () => {
  it("reads as where, how long and how much", () => {
    expect(summaryLine(workout(75, "Smart Fit Valle Oriente", 3, 4))).toBe(
      "Smart Fit Valle Oriente · 1 h 15 min · 2 exercises",
    );
  });

  it("says so when there was no gym, and counts one exercise as one", () => {
    expect(summaryLine(workout(30, null, 2))).toBe("No gym · 30 min · 1 exercise");
  });
});

describe("totalSets", () => {
  it("adds up the sets across the exercises", () => {
    expect(totalSets(workout(60, null, 3, 4, 2))).toBe(9);
    expect(totalSets(workout(60, null))).toBe(0);
  });
});
