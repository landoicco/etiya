import { type ReactNode, useEffect, useState } from "react";
import type { Api, GymSet, WeightUnit } from "./api";
import { ExercisePicker } from "./ExercisePicker";
import { useWakeLock } from "./useWakeLock";
import {
  type ActiveWorkout,
  addExercise,
  currentExercise,
  elapsedLabel,
  finishWorkout,
  hasWeight,
  loggedExercises,
  loggedSets,
  type LoggedExercise,
  logSet,
  nextSet,
  selectExercise,
  setLabel,
  setUnit,
  stepCount,
  stepWeight,
  UNIT_LABELS,
  undoLastSet,
  WEIGHT_UNITS,
  withCount,
  withWeight,
  type WorkoutRequest,
} from "./workout";

type Change = (workout: ActiveWorkout) => ActiveWorkout;

interface Props {
  api: Api;
  workout: ActiveWorkout;
  onChange: (change: Change) => void;
  onFinish: (request: WorkoutRequest) => void;
  onDiscard: () => void;
}

// The workout scrolls above and the set logger stays at the bottom, where the thumb is:
// logging a set never asks for a second hand, and never moves the button it just tapped
export function WorkoutScreen({ api, workout, onChange, onFinish, onDiscard }: Props) {
  useWakeLock();
  const [picking, setPicking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const exercise = currentExercise(workout);

  return (
    <main className="flex h-dvh flex-col">
      <div className="safe-x safe-top min-h-0 flex-1 overflow-y-auto pb-6">
        <Header workout={workout} onFinish={() => setFinishing(true)} />
        <ExerciseList
          workout={workout}
          onSelect={(index) => onChange((current) => selectExercise(current, index))}
        />
        <button
          type="button"
          onClick={() => setPicking(true)}
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

      {picking && (
        <ExercisePicker
          api={api}
          onPick={(choice) => {
            onChange((current) => addExercise(current, choice));
            setPicking(false);
          }}
          onClose={() => setPicking(false)}
        />
      )}

      {finishing && (
        <FinishSheet
          workout={workout}
          onSave={onFinish}
          onDiscard={onDiscard}
          onBack={() => setFinishing(false)}
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
        className="h-11 shrink-0 rounded-xl border border-accent px-4 text-sm font-semibold text-accent disabled:border-line disabled:text-muted"
      >
        Finish
      </button>
    </header>
  );
}

// Both ways out of a workout live here, so neither is a stray tap away while training, and
// what is about to be saved is on screen before it is
function FinishSheet({
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
          className="h-16 w-full rounded-2xl bg-accent text-lg font-semibold text-surface disabled:opacity-40"
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

// Two taps, since one misplaced thumb should not throw away an hour of training. The
// confirmation forgets itself, so a pocket tap cannot arm it and a later one finish the job
function DiscardButton({ onDiscard }: { onDiscard: () => void }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) {
      return;
    }
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="button"
      onClick={() => (armed ? onDiscard() : setArmed(true))}
      className={
        armed
          ? "h-12 w-full rounded-xl bg-red-950 text-sm font-semibold text-red-200"
          : "h-12 w-full text-sm text-muted"
      }
    >
      {armed ? "Tap again to discard this workout" : "Discard workout"}
    </button>
  );
}

function ExerciseList({
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
        current ? "border-accent" : "border-line"
      }`}
    >
      <p className="font-semibold">{exercise.name}</p>
      <p className="mt-1 text-sm text-muted">
        {exercise.sets.length === 0 ? "No sets yet" : exercise.sets.map(setLabel).join(" · ")}
      </p>
    </button>
  );
}

function SetLogger({
  exercise,
  draft,
  onLog,
  onUndo,
}: {
  exercise: LoggedExercise;
  draft: GymSet;
  onLog: (set: GymSet) => void;
  onUndo: () => void;
}) {
  const [set, setSet] = useState(draft);

  return (
    <section className="safe-x safe-bottom border-t border-line bg-raised pt-4">
      <p className="truncate text-sm font-semibold text-muted">{exercise.name}</p>

      <div className="mt-2 flex gap-3">
        <Stepper
          label="Reps"
          value={set.count}
          keypad="numeric"
          onStep={(taps) => setSet(stepCount(set, taps))}
          onType={(typed) => setSet(withCount(set, typed))}
        />
        {hasWeight(set.unit) && (
          <Stepper
            label={UNIT_LABELS[set.unit]}
            value={set.weight}
            keypad="decimal"
            onStep={(taps) => setSet(stepWeight(set, taps))}
            onType={(typed) => setSet(withWeight(set, typed))}
          />
        )}
      </div>

      <div className="mt-3 flex gap-2">
        {WEIGHT_UNITS.map((unit) => (
          <UnitButton
            key={unit}
            unit={unit}
            selected={unit === set.unit}
            onSelect={() => setSet(setUnit(set, unit))}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => onLog(set)}
        className="mt-3 h-16 w-full rounded-2xl bg-accent text-lg font-semibold text-surface"
      >
        Log set
      </button>
      <button
        type="button"
        onClick={onUndo}
        disabled={exercise.sets.length === 0}
        className="mt-1 h-11 w-full text-sm text-muted disabled:opacity-40"
      >
        Undo last set
      </button>
    </section>
  );
}

function Stepper({
  label,
  value,
  keypad,
  onStep,
  onType,
}: {
  label: string;
  value: number;
  keypad: "numeric" | "decimal";
  onStep: (taps: number) => void;
  onType: (value: number) => void;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-center text-xs text-muted">{label}</p>
      <div className="mt-1 flex items-center gap-1">
        <StepButton label={`Less ${label}`} onStep={() => onStep(-1)}>
          −
        </StepButton>
        <NumberField label={label} value={value} keypad={keypad} onType={onType} />
        <StepButton label={`More ${label}`} onStep={() => onStep(1)}>
          +
        </StepButton>
      </div>
    </div>
  );
}

// Tapping the number opens the phone's keypad, for the jumps the steppers would take too
// many taps to reach: 20 kg to 100 kg. While it is being typed the field holds the text as
// written, so a half-finished "6." is not read as a number yet; leaving the field commits
// it, and anything unreadable leaves the value alone
function NumberField({
  label,
  value,
  keypad,
  onType,
}: {
  label: string;
  value: number;
  keypad: "numeric" | "decimal";
  onType: (value: number) => void;
}) {
  const [typed, setTyped] = useState<string | null>(null);

  function commit() {
    // A Spanish keypad puts a comma where the decimal point goes
    const entered = Number(typed?.replace(",", "."));
    if (typed !== null && typed.trim() !== "" && Number.isFinite(entered)) {
      onType(entered);
    }
    setTyped(null);
  }

  return (
    <input
      type="text"
      inputMode={keypad}
      aria-label={label}
      enterKeyHint="done"
      value={typed ?? String(value)}
      // Selected on focus, so the first key typed replaces the set instead of extending it
      onFocus={(event) => {
        setTyped(String(value));
        event.target.select();
      }}
      onChange={(event) => setTyped(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.currentTarget.blur();
        }
      }}
      className="min-w-0 flex-1 border-b border-dashed border-line bg-transparent text-center text-3xl font-bold tabular-nums focus:border-solid focus:border-accent focus:outline-none"
    />
  );
}

function StepButton({
  label,
  onStep,
  children,
}: {
  label: string;
  onStep: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onStep}
      aria-label={label}
      className="h-14 w-14 shrink-0 rounded-2xl border border-line text-2xl active:bg-line"
    >
      {children}
    </button>
  );
}

function UnitButton({
  unit,
  selected,
  onSelect,
}: {
  unit: WeightUnit;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`h-11 flex-1 rounded-xl text-sm font-semibold ${
        selected ? "bg-accent text-surface" : "border border-line text-muted"
      }`}
    >
      {UNIT_LABELS[unit]}
    </button>
  );
}

// The clock is only ever read to the second, and browsers throttle this to a crawl while the
// app is in the background, which is exactly when nobody is looking at it
function useNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return now;
}
