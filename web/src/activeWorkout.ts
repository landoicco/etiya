import { del, get, set } from "idb-keyval";
import type { ActiveWorkout } from "./workout";

// The workout in progress is saved on every change, under one key. iOS kills a standalone
// PWA whenever it wants, so the app opens straight back into it instead of losing it
const KEY = "active-workout";

// Nothing here throws: a browser with storage blocked (private mode) costs the workout in
// progress, not the app, and the screens treat that as "no workout in progress"
export async function loadActiveWorkout(): Promise<ActiveWorkout | null> {
  try {
    return (await get<ActiveWorkout>(KEY)) ?? null;
  } catch {
    // Storage unavailable
    return null;
  }
}

export async function saveActiveWorkout(workout: ActiveWorkout): Promise<void> {
  try {
    await set(KEY, workout);
  } catch {
    // Storage unavailable
  }
}

export async function clearActiveWorkout(): Promise<void> {
  try {
    await del(KEY);
  } catch {
    // Storage unavailable
  }
}
