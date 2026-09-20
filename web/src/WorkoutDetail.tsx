import type { Api } from "./api";
import type { Router } from "./router";
import { setLabel } from "./workout";
import { dayLabel, durationLabel, totalSets, useWorkout } from "./workouts";

// One saved workout, set by set. It is the only screen reachable by a link, so it has to
// stand on its own: opened from a list it is already in hand, reloaded it fetches itself
export function WorkoutDetail({ api, id, router }: { api: Api; id: string; router: Router }) {
  const { data: workout, error, isPending, fetchStatus } = useWorkout(api, id);

  return (
    <main className="flex h-dvh flex-col">
      <div className="safe-x safe-top flex items-start justify-between gap-4 pb-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">
            {workout ? dayLabel(workout.startedAt) : "Workout"}
          </h1>
          {workout && (
            <p className="mt-1 text-sm text-muted">
              {workout.gymName ?? "No gym"} · {durationLabel(workout)} · {totalSets(workout)} sets
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={router.close}
          className="h-11 shrink-0 px-2 text-sm text-muted"
        >
          Back
        </button>
      </div>

      <div className="safe-x safe-bottom min-h-0 flex-1 overflow-y-auto">
        {isPending && (
          <Notice>
            {fetchStatus === "paused"
              ? "Offline, and this workout is not on the phone. It opens once you are back online."
              : "Loading…"}
          </Notice>
        )}

        {error && <Notice>{error.message}</Notice>}

        {workout && (
          <ul className="space-y-3">
            {workout.exercises.map((exercise, index) => (
              // A saved workout never changes and this list never reorders, so an
              // exercise's place in it identifies it as well as anything could: the same
              // exercise can appear twice in a superset, and its name would not
              // oxlint-disable-next-line react/no-array-index-key
              <li key={index} className="rounded-2xl border border-line bg-raised p-4">
                <p className="font-semibold">{exercise.name}</p>
                <ol className="mt-2 space-y-1">
                  {exercise.sets.map((set, setIndex) => (
                    // Same here, and the number shown is the index itself
                    // oxlint-disable-next-line react/no-array-index-key
                    <li key={setIndex} className="flex gap-3 text-sm">
                      <span className="w-5 shrink-0 text-muted tabular-nums">{setIndex + 1}</span>
                      <span className="tabular-nums">{setLabel(set)}</span>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-line bg-raised p-5 text-sm text-muted">{children}</p>
  );
}
