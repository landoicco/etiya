import { type ReactNode, useState } from "react";
import type { Api, WeightUnit } from "@/platform/api";
import type { PendingWorkout } from "@/platform/sendQueue";
import { setLabel, UNIT_LABELS } from "@/workout/workout";
import { exerciseStats, lastUnit } from "./exerciseStats";
import { monthBefore, useLastMonth, withQueued } from "./lastMonth";
import { dayLabel } from "./workouts";

// Over the workout, from the bottom, and gone with a tap outside or the back gesture
export function ExerciseHistory({
  api,
  pending,
  exercise,
  name,
  unit,
  onClose,
}: {
  api: Api;
  pending: PendingWorkout[];
  // Its identity, as identityOf gives it
  exercise: string;
  name: string;
  // The unit of its last set in this workout, null before the first one
  unit: WeightUnit | null;
  onClose: () => void;
}) {
  const { data, isPending, fetchStatus } = useLastMonth(api);
  const [now] = useState(() => new Date());
  const workouts = withQueued(data ?? [], pending);
  const shown = unit ?? lastUnit(workouts, exercise) ?? "KG";
  const stats = exerciseStats(workouts, exercise, shown, monthBefore(now));
  const label = UNIT_LABELS[shown];

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-end bg-ink/40" onClick={onClose}>
      <section
        className="safe-x safe-bottom max-h-[80dvh] overflow-y-auto rounded-t-3xl bg-surface pt-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold">{name}</h2>
            <p className="text-sm text-muted">Last 30 days</p>
          </div>
          <button type="button" onClick={onClose} className="h-11 shrink-0 px-2 text-sm text-muted">
            Close
          </button>
        </div>

        {stats ? (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <Figure term="Average" value={`${stats.average} ${label}`} />
              <Figure term="Max" value={`${stats.max} ${label}`} />
            </dl>
            <p className="mt-4 text-sm font-semibold text-muted">
              Heaviest set of {stats.sessions.length === 1 ? "the session" : `${stats.sessions.length} sessions`}
            </p>
            <ul className="mt-1 divide-y divide-line pb-4">
              {stats.sessions.map((session) => (
                <li key={session.startedAt} className="flex justify-between gap-4 py-3 text-sm">
                  <span className="text-muted">{dayLabel(session.startedAt)}</span>
                  <span className="font-semibold tabular-nums">{setLabel(session.set)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Notice>
            {isPending
              ? fetchStatus === "paused"
                ? "Offline. The history loads once you are back online."
                : "Loading…"
              : "Not done in the last 30 days."}
          </Notice>
        )}
      </section>
    </div>
  );
}

function Figure({ term, value }: { term: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-raised p-4">
      <dt className="text-sm text-muted">{term}</dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 mb-4 rounded-2xl border border-line bg-raised p-5 text-sm text-muted">{children}</p>
  );
}
