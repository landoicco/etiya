import { describe, expect, it, vi } from "vitest";
import { type Api, ApiError, type Workout } from "./api";
import { type PendingWorkout, sendPending } from "./sendQueue";
import type { WorkoutRequest } from "./workout";

function request(id: string): WorkoutRequest {
  return {
    id,
    startedAt: "2026-09-19T18:30:00.000Z",
    endedAt: "2026-09-19T19:30:00.000Z",
    gymId: null,
    gymName: null,
    exercises: [
      {
        exerciseCatalogItemId: "barbell-bench-press",
        name: "Barbell Bench Press",
        sets: [{ count: 10, weight: 60, unit: "KG" }],
      },
    ],
  };
}

function queued(...workoutIds: string[]): PendingWorkout[] {
  return workoutIds.map((id) => ({ request: request(id), refusal: null }));
}

// Only saveWorkout is ever called, so the rest of the API is not worth standing up
function apiThat(saveWorkout: Api["saveWorkout"]): Api {
  return { saveWorkout } as Api;
}

// Nothing here reads what the API answers with, only whether it answered
const STORED = {} as Workout;

function sender() {
  return vi.fn<Api["saveWorkout"]>();
}

function ids(pending: PendingWorkout[]): string[] {
  return pending.map((item) => item.request.id);
}

describe("sendPending", () => {
  it("empties the queue when everything goes through", async () => {
    const save = sender().mockResolvedValue(STORED);

    const { left, sent } = await sendPending(apiThat(save), queued("a", "b"));

    expect(left).toEqual([]);
    expect(sent).toBe(2);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("stops at the first workout it cannot send, so the order survives", async () => {
    const save = sender().mockRejectedValue(new TypeError("Failed to fetch"));

    const { left, sent } = await sendPending(apiThat(save), queued("a", "b", "c"));

    expect(ids(left)).toEqual(["a", "b", "c"]);
    expect(sent).toBe(0);
    // The second and third are not even attempted: there is no connection to attempt on
    expect(save).toHaveBeenCalledTimes(1);
  });

  // 401 is a token that ran out while the phone was in a locker, 429 is being asked to wait.
  // Both are 4xx, and neither means the workout is unacceptable
  it.each([401, 429])("keeps trying after a %i", async (status) => {
    const save = sender().mockRejectedValue(new ApiError(status, null, "Later"));

    const { left } = await sendPending(apiThat(save), queued("a"));

    expect(left[0]?.refusal).toBeNull();
  });

  it("marks a workout the API refuses for good, and moves on to the next", async () => {
    const save = sender()
      .mockRejectedValueOnce(new ApiError(404, "GYM_NOT_FOUND", "No such gym"))
      .mockResolvedValueOnce(STORED);

    const { left, sent } = await sendPending(apiThat(save), queued("a", "b"));

    expect(ids(left)).toEqual(["a"]);
    expect(left[0]?.refusal).toBe("No such gym");
    expect(sent).toBe(1);
  });

  it("does not retry one already refused, but still sends the others", async () => {
    const save = sender().mockResolvedValue(STORED);
    const refused: PendingWorkout = { request: request("a"), refusal: "No such gym" };

    const { left, sent } = await sendPending(apiThat(save), [refused, ...queued("b")]);

    expect(ids(left)).toEqual(["a"]);
    expect(sent).toBe(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("treats a 5xx as worth another go rather than a refusal", async () => {
    const save = sender().mockRejectedValue(new ApiError(503, null, "Unavailable"));

    const { left } = await sendPending(apiThat(save), queued("a"));

    expect(left[0]?.refusal).toBeNull();
  });
});
