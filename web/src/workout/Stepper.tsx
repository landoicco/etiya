import type { ReactNode } from "react";
import { NumberField } from "./NumberField";

// A value between the two ways of changing it: one tap at a time for an adjustment, the
// keypad for a jump
export function Stepper({
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
