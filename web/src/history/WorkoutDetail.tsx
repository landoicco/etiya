import type { Api } from "@/platform/api";
import type { Router } from "@/app/router";
import { dayCategoryLabel } from "@/exercises/dayCategory";
import { useExerciseCatalog } from "@/exercises/exerciseCatalog";
import { Icon } from "@/ui/Icon";
import { setLabel } from "@/workout/workout";
import { dayLabel, durationLabel, totalSets, useWorkout } from "./workouts";

// One saved workout, set by set. Opened from the history it is already in hand; opened by a
// link or a reload, it fetches itself
export function WorkoutDetail({ api, id, router }: { api: Api; id: string; router: Router }) {
  const { data: workout, error, isPending, fetchStatus } = useWorkout(api, id);
  const catalog = useExerciseCatalog(api).data ?? [];

  return (
    <main className="flex h-dvh flex-col">
      <div className="safe-x safe-top flex items-start justify-between gap-4 pb-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {(workout && dayCategoryLabel(workout.exercises, catalog)) || "Workout"}
          </h1>
          {workout && <p className="mt-0.5 text-sm text-muted">{dayLabel(workout.startedAt)}</p>}
        </div>
        <button
          type="button"
          onClick={() => router.close()}
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
          <>
            <dl className="mb-4 grid grid-cols-2 gap-2.5">
              <Fact term="Time" value={durationLabel(workout)} />
              <Fact term="Sets" value={String(totalSets(workout))} />
              <div className="col-span-2 flex items-center gap-2.5 rounded-[14px] border border-line bg-raised px-3.5 py-3 text-muted">
                <Icon name="pin" />
                <dt className="sr-only">Gym</dt>
                <dd className="truncate font-semibold text-ink">{workout.gymName ?? "No gym"}</dd>
              </div>
            </dl>

            <ul className="space-y-2.5 pb-4">
              {workout.exercises.map((exercise, index) => (
                // A saved workout never changes and this list never reorders, so an
                // exercise's place in it identifies it as well as anything could: the same
                // exercise can appear twice in a superset, and its name would not
                // oxlint-disable-next-line react/no-array-index-key
                <li key={index} className="rounded-card border border-line bg-raised px-4 py-3.5 shadow-card">
                  <p className="font-bold">{exercise.name}</p>
                  <ol className="mt-2 space-y-1">
                    {exercise.sets.map((set, setIndex) => (
                      // Same here, and the number shown is the index itself
                      // oxlint-disable-next-line react/no-array-index-key
                      <li key={setIndex} className="flex items-center gap-2.5 text-sm">
                        <span className="grid size-5.5 shrink-0 place-items-center rounded-full border border-line bg-surface text-[11px] font-semibold text-muted">
                          {setIndex + 1}
                        </span>
                        <span>{setLabel(set)}</span>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-line bg-raised px-3.5 py-3">
      <dt className="text-xs font-bold tracking-wider text-muted uppercase">{term}</dt>
      <dd className="mt-0.5 text-xl font-bold">{value}</dd>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-card border border-line bg-raised p-5 text-sm text-muted shadow-card">{children}</p>
  );
}
