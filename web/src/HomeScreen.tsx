import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { Api, Workout } from "./api";
import type { User } from "./auth";

// Enough to fill a phone screen; the full history gets its own paginated screen later
const RECENT_WORKOUTS = 10;

interface Props {
  api: Api;
  user: User;
  onSignOut: () => void;
  onStart: () => void;
}

// Content on top and the actions at the bottom, in reach of the thumb: the layout every
// screen follows
export function HomeScreen({ api, user, onSignOut, onStart }: Props) {
  return (
    <main className="safe-padding flex min-h-dvh flex-col">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">Etiya</h1>
          <p className="mt-1 truncate text-sm text-muted">{user.email ?? "Offline"}</p>
        </div>
        <button type="button" onClick={onSignOut} className="h-11 px-2 text-sm text-muted">
          Sign out
        </button>
      </header>

      <RecentWorkouts api={api} />

      <footer className="mt-auto pt-6">
        <button
          type="button"
          onClick={onStart}
          className="h-16 w-full rounded-2xl bg-accent text-lg font-semibold text-surface"
        >
          Start workout
        </button>
      </footer>
    </main>
  );
}

function RecentWorkouts({ api }: { api: Api }) {
  const { data, error, isPending, fetchStatus, refetch } = useQuery({
    queryKey: ["workouts", "recent"],
    queryFn: () => api.listWorkouts(RECENT_WORKOUTS),
  });

  if (isPending) {
    // Offline, TanStack Query pauses the request instead of failing it, and sends it when
    // the connection returns
    return <Notice>{fetchStatus === "paused" ? "Offline. Workouts load once you are back online." : "Loading…"}</Notice>;
  }

  if (error) {
    return (
      <Notice>
        {error.message}
        <button type="button" onClick={() => void refetch()} className="mt-3 block h-11 text-accent">
          Try again
        </button>
      </Notice>
    );
  }

  if (data.items.length === 0) {
    return <Notice>No workouts yet.</Notice>;
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold text-muted">Recent workouts</h2>
      <ul className="mt-3 space-y-3">
        {data.items.map((workout) => (
          <WorkoutItem key={workout.id} workout={workout} />
        ))}
      </ul>
    </section>
  );
}

function WorkoutItem({ workout }: { workout: Workout }) {
  const started = new Date(workout.startedAt);
  const minutes = Math.round((Date.parse(workout.endedAt) - started.getTime()) / 60_000);
  const exercises = workout.exercises.length;

  return (
    <li className="rounded-2xl border border-line bg-raised p-4">
      <p className="font-semibold">{DAY.format(started)}</p>
      <p className="mt-1 text-sm text-muted">
        {workout.gymName ?? "No gym"} · {minutes} min · {exercises}{" "}
        {exercises === 1 ? "exercise" : "exercises"}
      </p>
    </li>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <section className="mt-8 rounded-2xl border border-line bg-raised p-5 text-sm text-muted">
      {children}
    </section>
  );
}

// In the phone's language and time zone, e.g. "Tue, Sep 16, 6:30 PM"
const DAY = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
