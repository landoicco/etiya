import type { ReactNode } from "react";
import type { Api } from "@/platform/api";
import type { User } from "@/auth/auth";
import { GymPicker } from "@/gyms/GymPicker";
import { WorkoutCard } from "@/history/HistoryScreen";
import type { Router } from "./router";
import type { useSendQueue } from "@/platform/sendQueue";
import { useRecentWorkouts } from "@/history/workouts";
import type { WorkoutGym } from "@/workout/workout";

interface Props {
  api: Api;
  user: User;
  queue: SendQueue;
  // null until the browser has answered
  persisted: boolean | null;
  router: Router;
  onSignOut: () => void;
  onStarted: (gym: WorkoutGym | null) => void;
}

type SendQueue = ReturnType<typeof useSendQueue>;

// Content on top and the actions at the bottom, in reach of the thumb: the layout every
// screen follows
export function HomeScreen({ api, user, queue, persisted, router, onSignOut, onStarted }: Props) {
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

      <SendQueueNotice queue={queue} persisted={persisted} />
      <RecentWorkouts api={api} router={router} />

      <footer className="mt-auto pt-6">
        <button
          type="button"
          onClick={() => router.open({ name: "start" })}
          className="h-16 w-full rounded-2xl bg-accent text-lg font-semibold text-surface"
        >
          Start workout
        </button>
      </footer>

      {/* Starting asks where first, which is the one thing about a workout that is known
          before it begins and awkward to remember after it ends */}
      {router.route.name === "start" && (
        <GymPicker api={api} onStart={onStarted} onCancel={router.close} />
      )}
    </main>
  );
}

// A finished workout that has not reached the API yet is not lost, and saying so is the
// point: the app is trusted with an hour of training and has to show where it went
function SendQueueNotice({ queue, persisted }: { queue: SendQueue; persisted: boolean | null }) {
  const refused = queue.pending.filter((item) => item.refusal !== null);
  const waiting = queue.pending.length - refused.length;

  if (queue.pending.length === 0) {
    return null;
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-raised p-5 text-sm">
      {waiting > 0 && (
        <p className="text-muted">
          {waiting === 1 ? "One workout is" : `${waiting} workouts are`} saved on this phone and
          {queue.sending ? " being sent now." : " waiting for a connection."}
        </p>
      )}

      {refused.map((item) => (
        <div key={item.request.id} className={waiting > 0 ? "mt-3" : undefined}>
          <p className="text-red-300">The API refused a workout: {item.refusal}</p>
          <button
            type="button"
            onClick={() => void queue.drop(item.request.id)}
            className="mt-2 h-11 text-muted"
          >
            Discard it
          </button>
        </div>
      ))}

      {waiting > 0 && !queue.sending && (
        <button type="button" onClick={() => void queue.flush()} className="mt-2 h-11 text-accent">
          Try again now
        </button>
      )}

      {/* Only said when something is actually waiting, and only when the browser refused to
          promise it will keep it. Installing the app is what turns the refusal into a yes */}
      {waiting > 0 && persisted === false && (
        <p className="mt-3 text-muted">
          This browser may clear saved data to free up space. Add Etiya to your home screen and
          it will keep it instead.
        </p>
      )}
    </section>
  );
}

function RecentWorkouts({ api, router }: { api: Api; router: Router }) {
  const { data, error, isPending, fetchStatus, refetch } = useRecentWorkouts(api);

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
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-muted">Recent workouts</h2>
        {/* Only worth offering once there is more than what fits here */}
        {data.nextCursor !== null && (
          <button
            type="button"
            onClick={() => router.open({ name: "history" })}
            className="h-11 text-sm text-accent"
          >
            See all
          </button>
        )}
      </div>
      <ul className="mt-1 space-y-3">
        {data.items.map((workout) => (
          <li key={workout.id}>
            <WorkoutCard
              workout={workout}
              onOpen={() => router.open({ name: "workout", id: workout.id })}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <section className="mt-8 rounded-2xl border border-line bg-raised p-5 text-sm text-muted">
      {children}
    </section>
  );
}
