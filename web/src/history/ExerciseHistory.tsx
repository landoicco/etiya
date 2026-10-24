import { type ReactNode, useState } from "react";
import type { Api, WeightUnit } from "@/platform/api";
import type { PendingWorkout } from "@/platform/sendQueue";
import { BottomSheet } from "@/ui/BottomSheet";
import { CloseButton } from "@/ui/CloseButton";
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
    <BottomSheet onClose={onClose}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold tracking-tight">{name}</h2>
          <p className="text-sm text-muted">Last 30 days</p>
        </div>
        <CloseButton onClose={onClose} />
      </div>

      {stats ? (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-2.5">
            <Figure term="Average" value={String(stats.average)} unit={label} />
            <Figure term="Max" value={String(stats.max)} unit={label} />
          </dl>
          <p className="mt-5 text-xs font-bold tracking-wider text-muted uppercase">
            Heaviest set of {stats.sessions.length === 1 ? "the session" : `${stats.sessions.length} sessions`}
          </p>
          <ul className="mt-1 divide-y divide-line pb-2">
            {stats.sessions.map((session) => (
              <li key={session.startedAt} className="flex justify-between gap-4 py-3 text-sm">
                <span className="text-muted">{dayLabel(session.startedAt)}</span>
                <span className="font-bold">{setLabel(session.set)}</span>
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
    </BottomSheet>
  );
}

function Figure({ term, value, unit }: { term: string; value: string; unit: string }) {
  return (
    <div className="rounded-[14px] border border-line bg-surface px-3.5 py-3">
      <dt className="text-xs font-bold tracking-wider text-muted uppercase">{term}</dt>
      <dd className="mt-0.5 text-2xl font-bold">
        {value} <span className="text-sm font-semibold text-muted">{unit}</span>
      </dd>
    </div>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 mb-2 rounded-card border border-line bg-surface p-5 text-sm text-muted">{children}</p>
  );
}
