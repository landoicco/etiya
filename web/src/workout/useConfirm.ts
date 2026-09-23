import { useEffect, useState } from "react";

// The confirmation forgets itself, so a pocket tap cannot arm it and a later one finish the job
const FORGETS_AFTER_MS = 4000;

// Two taps for anything that throws away work that cannot be recovered. Only the behaviour is
// shared: each caller renders its own two states, since what changes is the words and the colour
export function useConfirm(onConfirm: () => void) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) {
      return;
    }
    const timer = setTimeout(() => setArmed(false), FORGETS_AFTER_MS);
    return () => clearTimeout(timer);
  }, [armed]);

  function onClick() {
    if (!armed) {
      setArmed(true);
      return;
    }
    // Disarmed before firing: a button that survives the action must not stay armed for the
    // next tap
    setArmed(false);
    onConfirm();
  }

  return { armed, onClick };
}
