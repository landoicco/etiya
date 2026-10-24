import { DiscardButton } from "./DiscardButton";
import { Summary } from "./Summary";
import { useNow } from "@/platform/useNow";
import { BottomSheet } from "@/ui/BottomSheet";
import { Button } from "@/ui/Button";
import {
  type ActiveWorkout,
  elapsedLabel,
  finishWorkout,
  loggedExercises,
  loggedSets,
} from "./workout";
import type { WorkoutRequest } from "@/platform/api";

// Both ways out of a workout, away from stray taps. The summary is the last chance to catch a
// mistake: a saved workout cannot be edited
export function FinishSheet({
  workout,
  userName,
  onSave,
  onDiscard,
  onBack,
}: {
  workout: ActiveWorkout;
  userName: string | null;
  onSave: (request: WorkoutRequest) => void;
  onDiscard: () => void;
  onBack: () => void;
}) {
  const now = useNow();
  const request = finishWorkout(workout, now);
  const dropped = workout.exercises.length - loggedExercises(workout);

  return (
    <BottomSheet onClose={onBack}>
      <h2 className="text-2xl font-bold tracking-tight">{userName ? `Nice work, ${userName}` : "Nice work"}</h2>

      <dl className="mt-4 grid grid-cols-2 gap-2.5">
        <Stat term="Duration" value={elapsedLabel(workout, now)} />
        <Stat term="Gym" value={workout.gymName ?? "No gym"} text />
        <Stat term="Exercises" value={String(loggedExercises(workout))} />
        <Stat term="Sets" value={String(loggedSets(workout))} />
      </dl>

      {request !== null && <Summary request={request} />}

      {/* Visible, not behind the info icon: it says what is about to be lost */}
      {dropped > 0 && (
        <p className="mt-3 text-sm text-muted">
          {dropped === 1 ? "One exercise has" : `${dropped} exercises have`} no sets and will not
          be saved.
        </p>
      )}

      <div className="mt-4 space-y-1">
        <Button onClick={() => request && onSave(request)} disabled={request === null}>
          Save workout
        </Button>
        <DiscardButton onDiscard={onDiscard} />
      </div>
    </BottomSheet>
  );
}

function Stat({ term, value, text = false }: { term: string; value: string; text?: boolean }) {
  return (
    <div className="min-w-0 rounded-[14px] border border-line bg-surface px-3.5 py-3">
      <dt className="text-xs font-bold tracking-wider text-muted uppercase">{term}</dt>
      <dd className={`mt-0.5 truncate font-bold ${text ? "pt-1 text-base" : "text-2xl"}`}>{value}</dd>
    </div>
  );
}
