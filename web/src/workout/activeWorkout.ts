import { del, get, set } from "idb-keyval";
import type { ActiveWorkout } from "./workout";

const KEY = "active-workout";

// Nothing here throws: with storage blocked the screens see "no workout in progress", which
// is a worse session but a working app
export async function loadActiveWorkout(): Promise<ActiveWorkout | null> {
  try {
    return (await get<ActiveWorkout>(KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function saveActiveWorkout(workout: ActiveWorkout): Promise<void> {
  try {
    await set(KEY, workout);
  } catch {
  }
}

export async function clearActiveWorkout(): Promise<void> {
  try {
    await del(KEY);
  } catch {
  }
}
