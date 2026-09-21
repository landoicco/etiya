import { useState } from "react";

// Tapping the number opens the phone's keypad, for the jumps the steppers would take too
// many taps to reach: 20 kg to 100 kg. While it is being typed the field holds the text as
// written, so a half-finished "6." is not read as a number yet; leaving the field commits
// it, and anything unreadable leaves the value alone
export function NumberField({
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
