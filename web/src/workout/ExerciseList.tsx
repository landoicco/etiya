import { type ActiveWorkout, type LoggedExercise, setLabel } from "./workout";

export function ExerciseList({
  workout,
  onSelect,
  onHistory,
}: {
  workout: ActiveWorkout;
  onSelect: (index: number) => void;
  onHistory: (exercise: LoggedExercise) => void;
}) {
  if (workout.exercises.length === 0) {
    return (
      <p className="mt-6 rounded-2xl border border-line bg-raised p-5 text-sm text-muted">
        No exercises yet. Add the first one and the set logger appears.
      </p>
    );
  }

  return (
    <ul className="mt-6 space-y-3">
      {workout.exercises.map((exercise, index) => (
        <li key={exercise.exerciseCatalogItemId ?? exercise.name}>
          <ExerciseRow
            exercise={exercise}
            current={index === workout.currentExerciseIndex}
            onSelect={() => onSelect(index)}
            onHistory={() => onHistory(exercise)}
          />
        </li>
      ))}
    </ul>
  );
}

// Tapping an exercise is how the logger moves to it, including back to an earlier one in
// the middle of a superset. The icon beside it opens its stats, out of the way until asked
function ExerciseRow({
  exercise,
  current,
  onSelect,
  onHistory,
}: {
  exercise: LoggedExercise;
  current: boolean;
  onSelect: () => void;
  onHistory: () => void;
}) {
  return (
    <div
      className={`flex items-start rounded-2xl border bg-raised ${
        current ? "border-accent-ink" : "border-line"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={current}
        className="min-w-0 flex-1 p-4 text-left"
      >
        <p className="font-semibold">{exercise.name}</p>
        <p className="mt-1 text-sm text-muted">
          {exercise.sets.length === 0 ? "No sets yet" : exercise.sets.map(setLabel).join(" · ")}
        </p>
      </button>
      <button
        type="button"
        onClick={onHistory}
        aria-label={`Last 30 days of ${exercise.name}`}
        className="flex h-14 w-12 shrink-0 items-center justify-center text-muted"
      >
        <StatsIcon />
      </button>
    </div>
  );
}

function StatsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M5 20V12M12 20V5M19 20v-9" />
    </svg>
  );
}
