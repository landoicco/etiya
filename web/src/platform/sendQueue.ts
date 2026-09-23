import { useQueryClient } from "@tanstack/react-query";
import { get, set } from "idb-keyval";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Api, ApiError } from "./api";
import type { WorkoutRequest } from "@/workout/workout";

// A finished workout goes here first, so finishing never waits on a connection
export interface PendingWorkout {
  request: WorkoutRequest;
  // Why the API refused it for good. Set means it is no longer retried on its own
  refusal: string | null;
}

const KEY = "pending-workouts";

export async function loadPending(): Promise<PendingWorkout[]> {
  try {
    return (await get<PendingWorkout[]>(KEY)) ?? [];
  } catch {
    return [];
  }
}

async function savePending(pending: PendingWorkout[]): Promise<void> {
  try {
    await set(KEY, pending);
  } catch {
  }
}

// 401 is an expired token and 429 is being asked to slow down; both are worth another go
// later. The rest of the 4xx are the API saying no and meaning it
function isPermanent(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 401 &&
    error.status !== 429
  );
}

// Takes what is queued and answers with what is still queued, touching no storage of its
// own, which is what makes it testable with nothing but a stub API
export async function sendPending(
  api: Api,
  pending: PendingWorkout[],
): Promise<{ left: PendingWorkout[]; sent: number }> {
  const left: PendingWorkout[] = [];
  let sent = 0;
  let unreachable = false;

  for (const item of pending) {
    if (unreachable || item.refusal !== null) {
      left.push(item);
      continue;
    }

    try {
      // One at a time, so the workouts keep the order they were finished in
      // oxlint-disable-next-line no-await-in-loop
      await api.saveWorkout(item.request);
      sent += 1;
    } catch (thrown) {
      if (isPermanent(thrown)) {
        left.push({ ...item, refusal: thrown.message });
      } else {
        // Unreachable: stop, so the ones behind keep their place in the queue
        unreachable = true;
        left.push(item);
      }
    }
  }

  return { left, sent };
}

export function useSendQueue(api: Api, initial: PendingWorkout[]) {
  const [pending, setPending] = useState(initial);
  const [sending, setSending] = useState(false);
  // Two flushes at once would be harmless, since the API answers a repeat with the stored
  // workout, but they would fight over the queue
  const busy = useRef(false);
  const queryClient = useQueryClient();

  const flush = useCallback(async () => {
    if (busy.current) {
      return;
    }
    busy.current = true;
    setSending(true);
    try {
      const { left, sent } = await sendPending(api, await loadPending());
      await savePending(left);
      setPending(left);
      if (sent > 0) {
        // The history on the home screen is now a workout short
        void queryClient.invalidateQueries({ queryKey: ["workouts"] });
      }
    } finally {
      busy.current = false;
      setSending(false);
    }
  }, [api, queryClient]);

  // On open and whenever the connection returns; iOS has no Background Sync to do better
  useEffect(() => {
    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [flush]);

  const add = useCallback(
    async (request: WorkoutRequest) => {
      const next = [...(await loadPending()), { request, refusal: null }];
      await savePending(next);
      setPending(next);
      await flush();
    },
    [flush],
  );

  // The only way out of a workout the API will never accept
  const drop = useCallback(async (id: string) => {
    const next = (await loadPending()).filter((item) => item.request.id !== id);
    await savePending(next);
    setPending(next);
  }, []);

  return { pending, sending, add, flush, drop };
}
