import { type ActiveWorkout, type LoggedExercise, setLabel } from "./workout";

export function ExerciseList({
  workout,
  onSelect,
}: {
  workout: ActiveWorkout;
  onSelect: (index: number) => void;
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
          />
        </li>
      ))}
    </ul>
  );
}

// Tapping an exercise is how the logger moves to it, including back to an earlier one in
// the middle of a superset
function ExerciseRow({
  exercise,
  current,
  onSelect,
}: {
  exercise: LoggedExercise;
  current: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={current}
      className={`w-full rounded-2xl border bg-raised p-4 text-left ${
        current ? "border-accent-ink" : "border-line"
      }`}
    >
      <p className="font-semibold">{exercise.name}</p>
      <p className="mt-1 text-sm text-muted">
        {exercise.sets.length === 0 ? "No sets yet" : exercise.sets.map(setLabel).join(" · ")}
      </p>
    </button>
  );
}
