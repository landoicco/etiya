import { useState } from "react";
import type { GymSet, WeightUnit } from "@/platform/api";
import { Stepper } from "./Stepper";
import { useConfirm } from "./useConfirm";
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
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-sm font-semibold text-muted">{exercise.name}</p>
        <UndoButton sets={exercise.sets.length} onUndo={onUndo} />
      </div>

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
        className="mt-3 h-16 w-full rounded-2xl bg-accent text-lg font-semibold text-on-accent"
      >
        Log set
      </button>
    </section>
  );
}

// Up by the exercise name, not under "Log set": full width and one line below the button a
// thumb taps all session, it was hit by mistake. Two taps, because an undone set is gone
function UndoButton({ sets, onUndo }: { sets: number; onUndo: () => void }) {
  const { armed, onClick } = useConfirm(onUndo);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={sets === 0}
      className={`h-11 shrink-0 rounded-xl px-3 text-sm font-semibold disabled:opacity-40 ${
        armed ? "bg-danger text-raised" : "border border-line text-muted"
      }`}
    >
      {armed ? "Tap again" : "Undo set"}
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
        selected ? "bg-accent text-on-accent" : "border border-line text-muted"
      }`}
    >
      {UNIT_LABELS[unit]}
    </button>
  );
}
