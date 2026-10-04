import { useQuery } from "@tanstack/react-query";
import { del, get, set } from "idb-keyval";
import type { Api, Workout } from "@/platform/api";
import type { PendingWorkout } from "@/platform/sendQueue";
import { WORKOUTS_KEY } from "./workouts";

// Under the workouts key, so the send queue's invalidation refreshes it too
export const LAST_MONTH_KEY = [...WORKOUTS_KEY, "lastMonth"];
const STORED_KEY = "last-month-workouts";

const DAYS = 30;
// The API's largest page
const PAGE = 100;

// What the stats and the home screen read: a stored workout, or a queued one not sent yet
export type PastWorkout = Pick<Workout, "id" | "startedAt" | "exercises">;

export function monthBefore(now: Date): Date {
  return new Date(now.getTime() - DAYS * 24 * 60 * 60 * 1000);
}

// The last 30 days, and never less than the latest workout, so "Last workout" survives a break
export async function fetchLastMonth(api: Api, now: Date): Promise<Workout[]> {
  const since = monthBefore(now).getTime();
  const workouts: Workout[] = [];
  let cursor: string | undefined;
  let more: boolean;

  do {
    // Newest first, so the next page only matters if this one ended inside the month
    // oxlint-disable-next-line no-await-in-loop
    const page = await api.listWorkouts(PAGE, cursor);
    const oldest = page.items.at(-1);
    workouts.push(...page.items);
    cursor = page.nextCursor ?? undefined;
    more = cursor !== undefined && oldest !== undefined && Date.parse(oldest.startedAt) >= since;
  } while (more);

  const recent = workouts.filter((workout) => Date.parse(workout.startedAt) >= since);
  return recent.length > 0 ? recent : workouts.slice(0, 1);
}

// Queued workouts count too: the session from the basement matters before it is sent. One
// already sent may be in both lists until the refetch, so it is kept once
export function withQueued(stored: PastWorkout[], pending: PendingWorkout[]): PastWorkout[] {
  const queued = pending.filter((item) => item.refusal === null).map((item) => item.request);
  const ids = new Set(queued.map((workout) => workout.id));
  return [...queued, ...stored.filter((workout) => !ids.has(workout.id))].toSorted(
    (a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt),
  );
}

// Read before the first render, so the home screen opens on it instead of a spinner
export async function loadCachedLastMonth(): Promise<Workout[] | null> {
  try {
    return (await get<Workout[]>(STORED_KEY)) ?? null;
  } catch {
    return null;
  }
}

async function saveLastMonth(workouts: Workout[]): Promise<void> {
  try {
    await set(STORED_KEY, workouts);
  } catch {
  }
}

// Somebody's training history, which the next user to sign in must not see
export async function forgetLastMonth(): Promise<void> {
  try {
    await del(STORED_KEY);
  } catch {
  }
}

export function useLastMonth(api: Api) {
  return useQuery({
    queryKey: LAST_MONTH_KEY,
    queryFn: async () => {
      const workouts = await fetchLastMonth(api, new Date());
      void saveLastMonth(workouts);
      return workouts;
    },
    // Read from the workout screen too, where an idle five minutes is normal
    gcTime: Infinity,
  });
}
