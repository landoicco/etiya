import { useState } from "react";
import { setLabel, type WorkoutRequest } from "./workout";

// The counts in the sheet say how much was trained; this says what. A wrong weight is the one
// mistake the rest of the sheet cannot show, because it looks exactly like a right one from the
// outside. Folded away by default: most workouts are fine, and nobody should have to scroll past
// their own sets to reach Save. Save stays in the footer, so checking never means navigating away
export function Summary({ request }: { request: WorkoutRequest }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="mt-3 h-12 w-full rounded-2xl border border-line text-sm font-semibold"
      >
        {open ? "Hide summary" : "View summary"}
      </button>

      {open && (
        <ul className="mt-3 space-y-3">
          {request.exercises.map((exercise) => (
            <li
              key={exercise.exerciseCatalogItemId ?? exercise.name}
              className="rounded-2xl border border-line bg-raised p-4"
            >
              <h3 className="font-semibold">{exercise.name}</h3>
              <ol className="mt-2 space-y-1">
                {exercise.sets.map((set, index) => (
                  // Three sets of 12 × 60 kg are identical as data, so content cannot identify
                  // them: the position is the identity. Safe here, where the list is read-only
                  // and built from a request that is already fixed, and never reorders
                  // oxlint-disable-next-line react/no-array-index-key
                  <li key={index} className="flex justify-between gap-4 text-sm">
                    <span className="text-muted tabular-nums">{index + 1}</span>
                    <span className="font-semibold tabular-nums">{setLabel(set)}</span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
