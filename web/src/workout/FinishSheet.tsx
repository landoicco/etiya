import { DiscardButton } from "./DiscardButton";
import { Summary } from "./Summary";
import { useNow } from "@/platform/useNow";
import {
  type ActiveWorkout,
  elapsedLabel,
  finishWorkout,
  loggedExercises,
  loggedSets,
  type WorkoutRequest,
} from "./workout";

// Both ways out of a workout live here, so neither is a stray tap away while training. It is
// also the last point where a mistake can still be caught, which is what the summary is for:
// there is no editing once a workout is saved, by choice
export function FinishSheet({
  workout,
  onSave,
  onDiscard,
  onBack,
}: {
  workout: ActiveWorkout;
  onSave: (request: WorkoutRequest) => void;
  onDiscard: () => void;
  onBack: () => void;
}) {
  const now = useNow();
  const request = finishWorkout(workout, now);
  const dropped = workout.exercises.length - loggedExercises(workout);

  return (
    <div className="fixed inset-0 z-10 flex h-dvh flex-col bg-surface">
      <div className="safe-x safe-top flex items-start justify-between gap-4 pb-3">
        <h2 className="text-2xl font-bold">Finish workout</h2>
        <button type="button" onClick={onBack} className="h-11 shrink-0 px-2 text-sm text-muted">
          Back
        </button>
      </div>

      <div className="safe-x min-h-0 flex-1 overflow-y-auto pb-4">
        <dl className="rounded-2xl border border-line bg-raised p-5">
          <Line term="Duration" value={elapsedLabel(workout, now)} />
          <Line term="Gym" value={workout.gymName ?? "No gym"} />
          <Line term="Exercises" value={String(loggedExercises(workout))} />
          <Line term="Sets" value={String(loggedSets(workout))} />
        </dl>

        {request !== null && <Summary request={request} />}

        {dropped > 0 && (
          <p className="mt-3 text-sm text-muted">
            {dropped === 1 ? "One exercise has" : `${dropped} exercises have`} no sets and will not
            be saved.
          </p>
        )}

        <p className="mt-3 text-sm text-muted">
          Saved on this phone first, and sent as soon as there is a connection.
        </p>
      </div>

      <div className="safe-x safe-bottom space-y-2 border-t border-line bg-raised pt-3">
        <button
          type="button"
          onClick={() => request && onSave(request)}
          disabled={request === null}
          className="h-16 w-full rounded-2xl bg-accent text-lg font-semibold text-on-accent disabled:opacity-40"
        >
          Save workout
        </button>
        <DiscardButton onDiscard={onDiscard} />
      </div>
    </div>
  );
}

function Line({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <dt className="text-muted">{term}</dt>
      <dd className="truncate font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
