import { useState } from "react";
import type { WorkoutRequest } from "@/platform/api";
import { Icon } from "@/ui/Icon";
import { setLabel } from "./workout";

// The counts above say how much was trained; this says what. Folded away by default
export function Summary({ request }: { request: WorkoutRequest }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(false);

  return (
    <>
      <div className="mt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="h-11 text-sm font-semibold text-accent-ink"
        >
          {open ? "Hide summary" : "View summary ›"}
        </button>
        <button
          type="button"
          onClick={() => setInfo(!info)}
          aria-expanded={info}
          aria-label="Where the workout is saved"
          className="grid size-11 place-items-center text-muted"
        >
          <Icon name="info" />
        </button>
      </div>

      {info && (
        <p className="text-sm text-muted">Saved on this phone first, and sent as soon as there is a connection.</p>
      )}

      {open && (
        <ul className="mt-2 space-y-2.5">
          {request.exercises.map((exercise) => (
            <li
              key={exercise.exerciseCatalogItemId ?? exercise.name}
              className="rounded-card border border-line bg-surface px-4 py-3"
            >
              <h3 className="font-bold">{exercise.name}</h3>
              <ol className="mt-2 space-y-1">
                {exercise.sets.map((set, index) => (
                  // Identical sets are common, so only the position identifies one
                  // oxlint-disable-next-line react/no-array-index-key
                  <li key={index} className="flex items-center gap-2.5 text-sm">
                    <span className="grid size-5.5 shrink-0 place-items-center rounded-full border border-line text-[11px] font-semibold text-muted">
                      {index + 1}
                    </span>
                    <span className="font-semibold">{setLabel(set)}</span>
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
