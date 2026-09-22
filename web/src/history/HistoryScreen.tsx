import type { ReactNode } from "react";
import type { Api, Workout } from "@/platform/api";
import type { Router } from "@/app/router";
import { dayLabel, summaryLine, useWorkoutHistory } from "./workouts";

// Pages are asked for one at a time, by a button rather than by scrolling: a tap is honest
// about costing a request, and an infinite scroll on a phone is easy to trigger by accident
export function HistoryScreen({ api, router }: { api: Api; router: Router }) {
  const { data, error, isPending, fetchStatus, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useWorkoutHistory(api);

  const workouts = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <main className="flex h-dvh flex-col">
      <div className="safe-x safe-top flex items-center justify-between gap-4 pb-3">
        <h1 className="text-2xl font-bold">History</h1>
        <button type="button" onClick={() => router.close()} className="h-11 shrink-0 px-2 text-sm text-muted">
          Back
        </button>
      </div>

      <div className="safe-x safe-bottom min-h-0 flex-1 overflow-y-auto">
        {isPending && (
          <Notice>
            {fetchStatus === "paused"
              ? "Offline. The history loads once you are back online."
              : "Loading…"}
          </Notice>
        )}

        {error && <Notice>{error.message}</Notice>}

        {data && workouts.length === 0 && (
          <Notice>No workouts yet. The first one shows up here once it is sent.</Notice>
        )}

        <ul className="space-y-3">
          {workouts.map((workout) => (
            <li key={workout.id}>
              <WorkoutCard
                workout={workout}
                onOpen={() => router.open({ name: "workout", id: workout.id })}
              />
            </li>
          ))}
        </ul>

        {hasNextPage && (
          <button
            type="button"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mt-3 h-14 w-full rounded-2xl border border-line font-semibold disabled:opacity-40"
          >
            {isFetchingNextPage ? "Loading…" : "Load older workouts"}
          </button>
        )}
      </div>
    </main>
  );
}

// The same card on the home screen and in the history, so a workout looks the same wherever
// it is met
export function WorkoutCard({ workout, onOpen }: { workout: Workout; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-line bg-raised p-4 text-left"
    >
      <p className="font-semibold">{dayLabel(workout.startedAt)}</p>
      <p className="mt-1 text-sm text-muted">{summaryLine(workout)}</p>
    </button>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-line bg-raised p-5 text-sm text-muted">{children}</p>
  );
}
