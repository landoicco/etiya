import type { ReactNode } from "react";
import type { Api } from "@/platform/api";
import type { User } from "@/auth/auth";
import { GymPicker } from "@/gyms/GymPicker";
import type { Router } from "./router";
import type { useSendQueue } from "@/platform/sendQueue";
import { dayCategoryLabel } from "@/exercises/dayCategory";
import { useExerciseCatalog } from "@/exercises/exerciseCatalog";
import { useLastMonth, withQueued } from "@/history/lastMonth";
import { agoLabel } from "@/history/workouts";
import { useNow } from "@/platform/useNow";
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
        {/* The queue does not know whose workouts it holds: whoever signs in next would send
            them as their own */}
        {queue.pending.length === 0 ? (
          <button type="button" onClick={onSignOut} className="h-11 px-2 text-sm text-muted">
            Sign out
          </button>
        ) : (
          <p className="max-w-36 py-2 text-right text-xs text-muted">
            Sign out once your workouts are sent
          </p>
        )}
      </header>

      <SendQueueNotice queue={queue} persisted={persisted} />
      <LastWorkout api={api} queue={queue} />

      <nav className="mt-4">
        <MenuRow label="History" onOpen={() => router.open({ name: "history" })} />
        <MenuRow label="About" onOpen={() => router.open({ name: "about" })} />
      </nav>

      <footer className="mt-auto pt-6">
        <button
          type="button"
          onClick={() => router.open({ name: "start" })}
          className="h-16 w-full rounded-2xl bg-accent text-lg font-semibold text-on-accent"
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

// Says where a finished workout is until it reaches the API
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
          <p className="text-danger">The API refused a workout: {item.refusal}</p>
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
        <button type="button" onClick={() => void queue.flush()} className="mt-2 h-11 text-accent-ink">
          Try again now
        </button>
      )}

      {/* Only with something waiting and storage refused; installing the app gets it granted */}
      {waiting > 0 && persisted === false && (
        <p className="mt-3 text-muted">
          This browser may clear saved data to free up space. Add Etiya to your home screen and
          it will keep it instead.
        </p>
      )}
    </section>
  );
}

// What was trained last, as a reference for what comes next. Read from the copy on the phone
// plus the queue, so it shows at once, offline too, and counts a workout not sent yet
function LastWorkout({ api, queue }: { api: Api; queue: SendQueue }) {
  const { data, error, isPending, fetchStatus, refetch } = useLastMonth(api);
  const catalog = useExerciseCatalog(api).data ?? [];
  const [last] = withQueued(data ?? [], queue.pending);
  // Ticks, so "Today" turns into "Yesterday" on an app left open overnight
  const now = useNow();

  if (last) {
    const category = dayCategoryLabel(last.exercises, catalog);
    const ago = agoLabel(last.startedAt, now);
    return (
      <Notice>
        <span className="block font-semibold text-muted">Last workout</span>
        <span className="mt-1 block text-base font-semibold text-ink">
          {category ? `${category} · ${ago}` : ago}
        </span>
      </Notice>
    );
  }

  if (isPending) {
    // Offline, TanStack Query pauses the request instead of failing it, and sends it when
    // the connection returns
    return <Notice>{fetchStatus === "paused" ? "Offline. Workouts load once you are back online." : "Loading…"}</Notice>;
  }

  if (error) {
    return (
      <Notice>
        {error.message}
        <button type="button" onClick={() => void refetch()} className="mt-3 block h-11 text-accent-ink">
          Try again
        </button>
      </Notice>
    );
  }

  return <Notice>No workouts yet. Start one and it shows up here.</Notice>;
}

function MenuRow({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-14 w-full items-center justify-between border-b border-line px-1 text-left font-semibold"
    >
      {label}
      <span aria-hidden className="text-muted">
        ›
      </span>
    </button>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <section className="mt-8 rounded-2xl border border-line bg-raised p-5 text-sm text-muted">
      {children}
    </section>
  );
}
