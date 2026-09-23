import type { Api } from "@/platform/api";
import { ExerciseList } from "./ExerciseList";
import { ExercisePicker } from "@/exercises/ExercisePicker";
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
  loggedSets,
  logSet,
  nextSet,
  selectExercise,
  undoLastSet,
  type WorkoutRequest,
} from "./workout";

type Change = (workout: ActiveWorkout) => ActiveWorkout;

interface Props {
  api: Api;
  workout: ActiveWorkout;
  router: Router;
  onChange: (change: Change) => void;
  onFinish: (request: WorkoutRequest) => void;
  onDiscard: () => void;
}

// The workout scrolls above and the set logger stays at the bottom, where the thumb is
export function WorkoutScreen({ api, workout, router, onChange, onFinish, onDiscard }: Props) {
  useWakeLock();
  const exercise = currentExercise(workout);
  const sheet = router.route.name;

  return (
    <main className="flex h-dvh flex-col">
      <div className="safe-x safe-top min-h-0 flex-1 overflow-y-auto pb-6">
        <Header workout={workout} onFinish={() => router.open({ name: "finish" })} />
        <ExerciseList
          workout={workout}
          onSelect={(index) => onChange((current) => selectExercise(current, index))}
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
            // Leaves the same way the back gesture would, so picking an exercise does not
            // leave a spent entry for the next back press to land on. An exercise just added
            // to the catalog is two entries deep, and the search behind it is finished with
            router.close(sheet === "newExercise" ? 2 : 1);
          }}
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

// Finishing is the only thing in the header besides the clock: it is disabled until there is
// a set to save, because the API refuses a workout with nothing in it
function Header({ workout, onFinish }: { workout: ActiveWorkout; onFinish: () => void }) {
  const now = useNow();

  return (
    <header className="flex items-center justify-between gap-4">
      <p className="text-3xl font-bold tabular-nums">{elapsedLabel(workout, now)}</p>
      <button
        type="button"
        onClick={onFinish}
        disabled={loggedSets(workout) === 0}
        className="h-11 shrink-0 rounded-xl border border-accent-ink px-4 text-sm font-semibold text-accent-ink disabled:border-line disabled:text-muted"
      >
        Finish
      </button>
    </header>
  );
}
