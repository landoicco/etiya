import type { Api, WorkoutRequest } from "@/platform/api";
import { ExerciseList } from "./ExerciseList";
import { ExercisePicker } from "@/exercises/ExercisePicker";
import { ExerciseHistory } from "@/history/ExerciseHistory";
import type { PendingWorkout } from "@/platform/sendQueue";
import { FinishSheet } from "./FinishSheet";
import type { Router } from "@/app/router";
import { SetLogger } from "./SetLogger";
import { useNow } from "@/platform/useNow";
import { useWakeLock } from "@/platform/useWakeLock";
import {
  type ActiveWorkout,
  addExercise,
  currentExercise,
  elapsedLabel,
  identityOf,
  logSet,
  nextSet,
  selectExercise,
  undoLastSet,
} from "./workout";

type Change = (workout: ActiveWorkout) => ActiveWorkout;

interface Props {
  api: Api;
  workout: ActiveWorkout;
  router: Router;
  // Queued workouts count in the exercise stats
  pending: PendingWorkout[];
  onChange: (change: Change) => void;
  onFinish: (request: WorkoutRequest) => void;
  onDiscard: () => void;
}

// The workout scrolls above and the set logger stays at the bottom, where the thumb is
export function WorkoutScreen({ api, workout, router, pending, onChange, onFinish, onDiscard }: Props) {
  useWakeLock();
  const exercise = currentExercise(workout);
  const { route } = router;
  const sheet = route.name;
  // Missing for a link to an exercise no longer in the workout, which then shows nothing
  const inHistory =
    route.name === "exerciseHistory"
      ? workout.exercises.find((logged) => identityOf(logged) === route.exercise)
      : undefined;

  return (
    <main className="flex h-dvh flex-col">
      <div className="safe-x safe-top min-h-0 flex-1 overflow-y-auto pb-6">
        <Header workout={workout} onFinish={() => router.open({ name: "finish" })} />
        <ExerciseList
          workout={workout}
          onSelect={(index) => onChange((current) => selectExercise(current, index))}
          onHistory={(logged) => router.open({ name: "exerciseHistory", exercise: identityOf(logged) })}
        />
        <button
          type="button"
          onClick={() => router.open({ name: "exercises" })}
          className="mt-4 h-14 w-full rounded-2xl border border-line font-semibold"
        >
          + Add exercise
        </button>
      </div>

      {exercise && (
        // A logged or undone set is a new draft, so the logger starts over from what the
        // next set should suggest
        <SetLogger
          key={`${workout.currentExerciseIndex}:${exercise.sets.length}`}
          exercise={exercise}
          draft={nextSet(workout)}
          onLog={(set) => onChange((current) => logSet(current, set))}
          onUndo={() => onChange(undoLastSet)}
        />
      )}

      {(sheet === "exercises" || sheet === "newExercise") && (
        <ExercisePicker
          api={api}
          router={router}
          onPick={(choice) => {
            onChange((current) => addExercise(current, choice));
            // Back out of the picker's entries, so back does not land on it again; a new
            // exercise is two entries deep, the search and the form
            router.close(sheet === "newExercise" ? 2 : 1);
          }}
        />
      )}

      {route.name === "exerciseHistory" && inHistory && (
        <ExerciseHistory
          api={api}
          pending={pending}
          exercise={route.exercise}
          name={inHistory.name}
          unit={inHistory.sets.at(-1)?.unit ?? null}
          onClose={() => router.close()}
        />
      )}

      {sheet === "finish" && (
        <FinishSheet
          workout={workout}
          onSave={onFinish}
          onDiscard={onDiscard}
          onBack={router.close}
        />
      )}
    </main>
  );
}

// Finishing is the only thing in the header besides the clock. Always enabled, even with no
// sets: the sheet it opens is also the only way to discard
function Header({ workout, onFinish }: { workout: ActiveWorkout; onFinish: () => void }) {
  const now = useNow();

  return (
    <header className="flex items-center justify-between gap-4">
      <p className="text-3xl font-bold tabular-nums">{elapsedLabel(workout, now)}</p>
      <button
        type="button"
        onClick={onFinish}
        className="h-11 shrink-0 rounded-xl border border-accent-ink px-4 text-sm font-semibold text-accent-ink"
      >
        Finish
      </button>
    </header>
  );
}
