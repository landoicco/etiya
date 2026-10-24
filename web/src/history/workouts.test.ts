import { describe, expect, it } from "vitest";
import type { Workout } from "@/platform/api";
import {
  agoLabel,
  byMonth,
  dateTile,
  daysAgo,
  durationLabel,
  minutesOf,
  summaryLine,
  totalSets,
} from "./workouts";

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

// Local times, as the phone sees them
function at(day: number, hour: number): Date {
  return new Date(2026, 9, day, hour);
}

describe("daysAgo", () => {
  it("counts calendar days, not 24-hour spans", () => {
    expect(daysAgo(at(3, 23).toISOString(), at(4, 7))).toBe(1);
    expect(daysAgo(at(4, 6).toISOString(), at(4, 22))).toBe(0);
    expect(daysAgo(at(1, 18).toISOString(), at(4, 9))).toBe(3);
  });
});

describe("agoLabel", () => {
  it("says today and yesterday in words", () => {
    expect(agoLabel(at(4, 6).toISOString(), at(4, 22))).toBe("Today");
    expect(agoLabel(at(3, 23).toISOString(), at(4, 7))).toBe("Yesterday");
  });

  it("counts the days after that", () => {
    expect(agoLabel(at(1, 18).toISOString(), at(4, 9))).toMatch(/, 3 days ago$/);
    expect(agoLabel(at(1, 18).toISOString(), at(20, 9))).toMatch(/, 19 days ago$/);
  });
});

function startedOn(year: number, month: number, day: number) {
  return { startedAt: new Date(year, month, day, 18).toISOString() };
}

// Labels follow the phone's language, so these check the grouping, not the month's name
describe("byMonth", () => {
  const now = new Date(2026, 9, 24);

  it("puts consecutive workouts of one month together, in the order given", () => {
    const october = [startedOn(2026, 9, 21), startedOn(2026, 9, 3)];
    const september = [startedOn(2026, 8, 29)];

    const groups = byMonth([...october, ...september], now);

    expect(groups.map((group) => group.workouts)).toEqual([october, september]);
    expect(groups[0]?.label).not.toBe(groups[1]?.label);
  });

  it("names the year only for a month of another year", () => {
    const groups = byMonth([startedOn(2026, 0, 5), startedOn(2025, 11, 30)], now);

    expect(groups[0]?.label).not.toMatch(/2026/);
    expect(groups[1]?.label).toMatch(/2025/);
  });

  it("tells the same month of two years apart", () => {
    expect(byMonth([startedOn(2026, 9, 1), startedOn(2025, 9, 1)], now)).toHaveLength(2);
  });

  it("has nothing to group in an empty history", () => {
    expect(byMonth([], now)).toEqual([]);
  });
});

describe("dateTile", () => {
  it("gives the day of the month and the weekday", () => {
    const tile = dateTile(new Date(2026, 9, 21, 18).toISOString());

    expect(tile.day).toBe("21");
    expect(tile.weekday).not.toBe("");
  });
});
