import type { ReactNode } from "react";
import type { Api } from "@/platform/api";
import type { User } from "@/auth/auth";
import { GymPicker } from "@/gyms/GymPicker";
import { HOME, type Router } from "./router";
import type { useSendQueue } from "@/platform/sendQueue";
import { dayCategoryLabel } from "@/exercises/dayCategory";
import { useExerciseCatalog } from "@/exercises/exerciseCatalog";
import { useLastMonth, withQueued } from "@/history/lastMonth";
import { agoLabel, durationLabel, totalSets } from "@/history/workouts";
import { useNow } from "@/platform/useNow";
import type { WorkoutGym } from "@/workout/workout";
import { Button } from "@/ui/Button";
import { Icon, type IconName } from "@/ui/Icon";
import { AccountSheet } from "./AccountSheet";
import { greeting, initialOf } from "./greeting";

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

const CARD = "rounded-card border border-line bg-raised shadow-card";

// Content on top and the actions at the bottom, in reach of the thumb: the layout every
// screen follows
export function HomeScreen({ api, user, queue, persisted, router, onSignOut, onStarted }: Props) {
  const now = useNow();

  return (
    <main className="safe-padding flex min-h-dvh flex-col">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {user.name ? (
            <>
              <p className="text-sm text-muted">{greeting(now)},</p>
              <h1 className="truncate text-3xl font-bold tracking-tight">{user.name}</h1>
            </>
          ) : (
            <h1 className="mt-4 text-3xl font-bold tracking-tight">{greeting(now)}</h1>
          )}
        </div>
        <button
          type="button"
          onClick={() => router.open({ name: "account" })}
          aria-label="Account"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-soft font-bold text-accent-ink"
        >
          {initialOf(user)}
        </button>
      </header>

      <SendQueueNotice queue={queue} persisted={persisted} />
      <LastWorkout api={api} queue={queue} now={now} />

      <nav className={`mt-4 overflow-hidden ${CARD}`}>
        <MenuRow icon="history" label="History" onOpen={() => router.open({ name: "history" })} />
        <MenuRow icon="info" label="About" onOpen={() => router.open({ name: "about" })} />
      </nav>

      <footer className="mt-auto pt-6">
        <Button icon="play" onClick={() => router.open({ name: "start" })}>
          Start workout
        </Button>
      </footer>

      {/* Starting asks where first, which is the one thing about a workout that is known
          before it begins and awkward to remember after it ends */}
      {router.route.name === "start" && (
        <GymPicker api={api} onStart={onStarted} onCancel={router.close} />
      )}

      {router.route.name === "account" && (
        <AccountSheet
          user={user}
          canSignOut={queue.pending.length === 0}
          onSignOut={() => {
            // So signing in again lands on home, not on this sheet
            router.replace(HOME);
            onSignOut();
          }}
          onClose={router.close}
        />
      )}
    </main>
  );
}

function SendQueueNotice({ queue, persisted }: { queue: SendQueue; persisted: boolean | null }) {
  const refused = queue.pending.filter((item) => item.refusal !== null);
  const waiting = queue.pending.length - refused.length;

  if (queue.pending.length === 0) {
    return null;
  }

  return (
    <section className={`mt-5 flex gap-3 p-4 text-sm ${CARD}`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-[14px] bg-soft text-accent-ink">
        <Icon name="cloud" />
      </span>
      <div className="min-w-0 flex-1">
        {waiting > 0 && (
          <div className="flex items-start justify-between gap-3">
            <p>
              {waiting === 1 ? "One workout" : `${waiting} workouts`} saved on this phone
              <span className="block text-muted">
                {queue.sending ? "Being sent now" : "Waiting for a connection"}
              </span>
            </p>
            {!queue.sending && (
              <button
                type="button"
                onClick={() => void queue.flush()}
                className="-my-2 h-11 shrink-0 font-semibold text-accent-ink"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {refused.map((item) => (
          <div key={item.request.id} className={waiting > 0 ? "mt-3" : undefined}>
            <p className="text-danger">The API refused a workout: {item.refusal}</p>
            <button
              type="button"
              onClick={() => void queue.drop(item.request.id)}
              className="mt-1 h-11 font-semibold text-muted"
            >
              Discard it
            </button>
          </div>
        ))}

        {/* Only with something waiting and storage refused; installing the app gets it granted */}
        {waiting > 0 && persisted === false && (
          <p className="mt-3 text-muted">
            This browser may clear saved data to free up space. Add Etiya to your home screen and
            it will keep it instead.
          </p>
        )}
      </div>
    </section>
  );
}

function LastWorkout({ api, queue, now }: { api: Api; queue: SendQueue; now: Date }) {
  const { data, error, isPending, fetchStatus, refetch } = useLastMonth(api);
  const catalog = useExerciseCatalog(api).data ?? [];
  const [last] = withQueued(data ?? [], queue.pending);

  if (last) {
    const category = dayCategoryLabel(last.exercises, catalog);
    return (
      <section className="relative mt-5 overflow-hidden rounded-card bg-brasa p-5 text-on-accent shadow-glow">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="absolute -top-3 -right-4 size-32 opacity-15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12" />
        </svg>
        <p className="text-xs font-bold tracking-wider uppercase opacity-75">Last workout</p>
        <p className="mt-1.5 text-4xl font-bold tracking-tight">{category || "Workout"}</p>
        <p className="mt-0.5 text-sm opacity-85">{agoLabel(last.startedAt, now)}</p>
        <dl className="mt-4 flex gap-5 text-xs opacity-90">
          <Fact term="time" value={durationLabel(last)} />
          <Fact term="exercises" value={String(last.exercises.length)} />
          <Fact term="sets" value={String(totalSets(last))} />
        </dl>
      </section>
    );
  }

  if (isPending) {
    return <Notice>{fetchStatus === "paused" ? "Offline. Workouts load once you are back online." : "Loading…"}</Notice>;
  }

  if (error) {
    return (
      <Notice>
        {error.message}
        <button type="button" onClick={() => void refetch()} className="mt-3 block h-11 font-semibold text-accent-ink">
          Try again
        </button>
      </Notice>
    );
  }

  return (
    <Notice>
      <span className="block text-xs font-bold tracking-wider uppercase">Last workout</span>
      <span className="mt-1.5 block text-base font-bold text-ink">No workouts yet</span>
      Start one and it shows up here.
    </Notice>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex flex-col-reverse">
      <dt>{term}</dt>
      <dd className="text-lg leading-tight font-bold">{value}</dd>
    </div>
  );
}

function MenuRow({ icon, label, onOpen }: { icon: IconName; label: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex h-15 w-full items-center gap-3 px-4 text-left font-semibold not-first:border-t not-first:border-line"
    >
      <span className="grid size-9 place-items-center rounded-[14px] bg-soft text-accent-ink">
        <Icon name={icon} />
      </span>
      {label}
      <span aria-hidden className="ml-auto text-muted">
        ›
      </span>
    </button>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return <section className={`mt-5 p-5 text-sm text-muted ${CARD}`}>{children}</section>;
}
