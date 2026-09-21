import { useEffect, useState } from "react";

// Two taps, since one misplaced thumb should not throw away an hour of training. The
// confirmation forgets itself, so a pocket tap cannot arm it and a later one finish the job
export function DiscardButton({ onDiscard }: { onDiscard: () => void }) {
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
