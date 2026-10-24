import { useState } from "react";
import type { GymSet, WeightUnit } from "@/platform/api";
import { Button } from "@/ui/Button";
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
    <section className="safe-x safe-bottom rounded-t-[26px] border-t border-line bg-raised pt-4 shadow-[0_-10px_30px_rgb(0_0_0/0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{exercise.name}</p>
          <p className="text-xs text-muted">Set {exercise.sets.length + 1}</p>
        </div>
        <UndoButton sets={exercise.sets.length} onUndo={onUndo} />
      </div>

      <div className="mt-3 flex gap-3">
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

      <div className="mt-3 flex gap-1 rounded-btn border border-line bg-surface p-1">
        {WEIGHT_UNITS.map((unit) => (
          <UnitButton
            key={unit}
            unit={unit}
            selected={unit === set.unit}
            onSelect={() => setSet(setUnit(set, unit))}
          />
        ))}
      </div>

      <Button icon="check" onClick={() => onLog(set)} className="mt-3">
        Log set
      </Button>
    </section>
  );
}

// By the exercise name, away from "Log set", where it was hit by mistake. Two taps: an undone
// set is gone
function UndoButton({ sets, onUndo }: { sets: number; onUndo: () => void }) {
  const { armed, onClick } = useConfirm(onUndo);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={sets === 0}
      className={`h-11 shrink-0 rounded-btn px-3.5 text-sm font-semibold disabled:opacity-40 ${
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
      className={`h-10 flex-1 rounded-[14px] text-sm font-bold ${
        selected ? "bg-raised text-ink shadow-sm" : "text-muted"
      }`}
    >
      {UNIT_LABELS[unit]}
    </button>
  );
}
