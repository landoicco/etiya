import { useState } from "react";
import { setLabel, type WorkoutRequest } from "./workout";

// The counts above say how much was trained; this says what. Folded away by default
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
                  // Identical sets are common, so only the position identifies one
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
