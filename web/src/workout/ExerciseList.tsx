import { Icon } from "@/ui/Icon";
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
      <p className="mt-6 rounded-card border border-line bg-raised p-5 text-sm text-muted shadow-card">
        No exercises yet. Add the first one and the set logger appears.
      </p>
    );
  }

  return (
    <ul className="mt-5 space-y-2.5">
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
      className={`flex items-start rounded-card border bg-raised shadow-card ${
        current ? "border-accent-ink ring-1 ring-accent-ink" : "border-line"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-current={current}
        className="min-w-0 flex-1 py-3.5 pl-4 text-left"
      >
        <p className="font-bold">{exercise.name}</p>
        {exercise.sets.length === 0 ? (
          <p className="mt-1.5 text-sm text-muted">No sets yet</p>
        ) : (
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {exercise.sets.map((set, index) => (
              // Identical sets are common, so only the position identifies one
              // oxlint-disable-next-line react/no-array-index-key
              <li key={index} className="rounded-full bg-soft px-2.5 py-0.5 text-xs font-semibold text-accent-ink">
                {setLabel(set)}
              </li>
            ))}
          </ul>
        )}
      </button>
      <button
        type="button"
        onClick={onHistory}
        aria-label={`Last 30 days of ${exercise.name}`}
        className="flex h-14 w-12 shrink-0 items-center justify-center text-muted"
      >
        <Icon name="stats" />
      </button>
    </div>
  );
}
