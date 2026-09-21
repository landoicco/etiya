import { useState } from "react";
import type { GymSet, WeightUnit } from "./api";
import { Stepper } from "./Stepper";
import {
  hasWeight,
  type LoggedExercise,
  setUnit,
  stepCount,
  stepWeight,
  UNIT_LABELS,
  WEIGHT_UNITS,
  withCount,
  withWeight,
} from "./workout";

// Pinned to the bottom of the screen, where the thumb already is: logging a set never asks
// for a second hand, and never moves the button it just tapped
export function SetLogger({
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
