import { type ReactNode, useState } from "react";
import type { Api, Workout } from "@/platform/api";
import type { Router } from "@/app/router";
import { dayCategoryLabel } from "@/exercises/dayCategory";
import { useExerciseCatalog } from "@/exercises/exerciseCatalog";
import { Button } from "@/ui/Button";
import { byMonth, dateTile, summaryLine, useWorkoutHistory } from "./workouts";

// Pages are asked for one at a time, by a button rather than by scrolling: a tap is honest
// about costing a request, and an infinite scroll on a phone is easy to trigger by accident
export function HistoryScreen({ api, router }: { api: Api; router: Router }) {
  const { data, error, isPending, fetchStatus, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useWorkoutHistory(api);
  const catalog = useExerciseCatalog(api).data ?? [];
  // Only decides whether a month needs its year
  const [now] = useState(() => new Date());

  const workouts = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <main className="flex h-dvh flex-col">
      <div className="safe-x safe-top flex items-center justify-between gap-4 pb-3">
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
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

        {byMonth(workouts, now).map((month) => (
          <section key={month.label} className="not-first:mt-5">
            <h2 className="px-0.5 pb-2 text-xs font-bold tracking-wider text-muted uppercase">{month.label}</h2>
            <ul className="space-y-2.5">
              {month.workouts.map((workout) => (
                <li key={workout.id}>
                  <WorkoutCard
                    workout={workout}
                    category={dayCategoryLabel(workout.exercises, catalog)}
                    onOpen={() => router.open({ name: "workout", id: workout.id })}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}

        {hasNextPage && (
          <Button
            variant="secondary"
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mt-4"
          >
            {isFetchingNextPage ? "Loading…" : "Load older workouts"}
          </Button>
        )}
      </div>
    </main>
  );
}

// What was trained leads, so a week of cards reads as a split: Push, Pull, Legs
function WorkoutCard({
  workout,
  category,
  onOpen,
}: {
  workout: Workout;
  // Empty when none of its exercises is in the catalog
  category: string;
  onOpen: () => void;
}) {
  const tile = dateTile(workout.startedAt);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-card border border-line bg-raised p-3 text-left shadow-card"
    >
      <span className="grid h-13 w-12 shrink-0 place-content-center rounded-[14px] border border-line bg-surface text-center">
        <span className="text-lg leading-none font-bold">{tile.day}</span>
        <span className="mt-0.5 text-[10.5px] font-bold tracking-wider text-muted uppercase">{tile.weekday}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{category || "Workout"}</span>
        <span className="block truncate text-sm text-muted">{summaryLine(workout)}</span>
      </span>
      <span aria-hidden="true" className="text-muted">
        ›
      </span>
    </button>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-card border border-line bg-raised p-5 text-sm text-muted shadow-card">{children}</p>
  );
}
