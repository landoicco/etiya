import { useCallback, useEffect, useState } from "react";
import { clearActiveWorkout, saveActiveWorkout } from "./activeWorkout";
import { type ActiveWorkout, startWorkout } from "./workout";

// The workout in progress lives in React state and in IndexedDB at the same time. Every
// change is written as soon as it is rendered, so a phone that kills the app between two
// sets reopens on the same set
export function useActiveWorkout(initial: ActiveWorkout | null) {
  const [workout, setWorkout] = useState(initial);

  useEffect(() => {
    if (workout !== null) {
      void saveActiveWorkout(workout);
    }
  }, [workout]);

  const start = useCallback(() => setWorkout(startWorkout(new Date())), []);

  // Takes one of the functions in workout.ts, so this hook knows nothing about what changed
  const update = useCallback((change: (workout: ActiveWorkout) => ActiveWorkout) => {
    setWorkout((current) => (current === null ? current : change(current)));
  }, []);

  const discard = useCallback(() => {
    setWorkout(null);
    void clearActiveWorkout();
  }, []);

  return { workout, start, update, discard };
}
