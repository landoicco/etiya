import { describe, expect, it, vi } from "vitest";
import type { Api, Page, Workout } from "@/platform/api";
import type { PendingWorkout } from "@/platform/sendQueue";
import { fetchLastMonth, withQueued } from "./lastMonth";

const NOW = new Date("2026-10-04T12:00:00Z");

function workout(id: string, startedAt: string): Workout {
  return {
    id,
    userId: "user",
    startedAt,
    endedAt: startedAt,
    gymId: null,
    gymName: null,
    exercises: [],
  };
}

// Pages in the order the API would send them, newest first; the cursor is the next index
function apiWith(...pages: Workout[][]) {
  const listWorkouts = vi.fn<Api["listWorkouts"]>(async (_limit, cursor) => {
    const index = cursor ? Number(cursor) : 0;
    const page: Page<Workout> = {
      items: pages[index] ?? [],
      nextCursor: index + 1 < pages.length ? String(index + 1) : null,
    };
    return page;
  });
  return { api: { listWorkouts } as unknown as Api, listWorkouts };
}

function ids(workouts: { id: string }[]): string[] {
  return workouts.map((item) => item.id);
}

describe("fetchLastMonth", () => {
  it("keeps the workouts of the last 30 days", async () => {
    const { api } = apiWith([
      workout("a", "2026-10-01T18:00:00Z"),
      workout("b", "2026-09-10T18:00:00Z"),
      workout("c", "2026-08-30T18:00:00Z"),
    ]);

    expect(ids(await fetchLastMonth(api, NOW))).toEqual(["a", "b"]);
  });

  it("asks for the next page only while the last one ended inside the month", async () => {
    const { api, listWorkouts } = apiWith(
      [workout("a", "2026-10-01T18:00:00Z"), workout("b", "2026-09-20T18:00:00Z")],
      [workout("c", "2026-09-15T18:00:00Z"), workout("d", "2026-08-01T18:00:00Z")],
      [workout("e", "2026-07-01T18:00:00Z")],
    );

    expect(ids(await fetchLastMonth(api, NOW))).toEqual(["a", "b", "c"]);
    expect(listWorkouts).toHaveBeenCalledTimes(2);
  });

  it("keeps the latest workout after a break longer than the month", async () => {
    const { api } = apiWith([
      workout("a", "2026-08-01T18:00:00Z"),
      workout("b", "2026-07-25T18:00:00Z"),
    ]);

    expect(ids(await fetchLastMonth(api, NOW))).toEqual(["a"]);
  });

  it("is empty for a user with no workouts", async () => {
    const { api } = apiWith([]);

    expect(await fetchLastMonth(api, NOW)).toEqual([]);
  });
});

function queued(id: string, startedAt: string, refusal: string | null = null): PendingWorkout {
  const { userId: _, ...request } = workout(id, startedAt);
  return { request, refusal };
}

describe("withQueued", () => {
  it("puts queued workouts among the stored ones, newest first", () => {
    const stored = [workout("b", "2026-10-02T18:00:00Z"), workout("d", "2026-09-28T18:00:00Z")];
    const pending = [queued("c", "2026-09-30T18:00:00Z"), queued("a", "2026-10-03T18:00:00Z")];

    expect(ids(withQueued(stored, pending))).toEqual(["a", "b", "c", "d"]);
  });

  it("keeps a workout once when it was sent but the copy is not refreshed yet", () => {
    const stored = [workout("a", "2026-10-03T18:00:00Z")];

    expect(ids(withQueued(stored, [queued("a", "2026-10-03T18:00:00Z")]))).toEqual(["a"]);
  });

  it("leaves out a workout the API refused, which will never be stored", () => {
    const pending = [queued("a", "2026-10-03T18:00:00Z", "Too long")];

    expect(withQueued([], pending)).toEqual([]);
  });
});
