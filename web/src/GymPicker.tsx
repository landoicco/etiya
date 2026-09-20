import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { type Api, ApiError, type Gym, type NewGym } from "./api";
import { slugOf } from "./catalog";
import {
  findGym,
  gymLabel,
  loadLastGym,
  saveLastGym,
  searchGyms,
  toWorkoutGym,
  useGymCatalog,
  useRegisterGym,
} from "./gyms";
import type { WorkoutGym } from "./workout";

interface Props {
  api: Api;
  onStart: (gym: WorkoutGym | null) => void;
  onCancel: () => void;
}

// The API refuses a name shorter than this
const MIN_NAME = 3;

// Opens on "Start workout", because where you are is known then and not worth a thought at
// the end. Every row starts the workout: picking the gym and starting are the same tap
export function GymPicker({ api, onStart, onCancel }: Props) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [last, setLast] = useState<WorkoutGym | null>(null);

  const { data, error, fetchStatus } = useGymCatalog(api);
  const gyms = data ?? [];
  const typed = query.trim();
  const results = searchGyms(gyms, query);

  useEffect(() => {
    void loadLastGym().then(setLast);
  }, []);

  function start(gym: WorkoutGym | null) {
    if (gym) {
      void saveLastGym(gym);
    }
    onStart(gym);
  }

  if (adding) {
    return (
      <Sheet>
        <NewGymForm
          api={api}
          name={typed}
          gyms={gyms}
          onCreated={start}
          onCancel={() => setAdding(false)}
        />
      </Sheet>
    );
  }

  return (
    <Sheet>
      <div className="safe-x safe-top flex items-start justify-between gap-4 pb-3">
        <h2 className="text-2xl font-bold">Where are you training?</h2>
        <button type="button" onClick={onCancel} className="h-11 shrink-0 px-2 text-sm text-muted">
          Cancel
        </button>
      </div>

      <div className="safe-x pb-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search gyms"
          aria-label="Search gyms"
          type="search"
          enterKeyHint="search"
          autoCapitalize="words"
          autoCorrect="off"
          className="h-14 w-full rounded-2xl border border-line bg-raised px-4 placeholder:text-muted"
        />
      </div>

      <div className="safe-x min-h-0 flex-1 overflow-y-auto pb-4">
        {/* The gym of the last workout, so training where you always train is one tap. It is
            hidden while searching, where it would just be a row out of order */}
        {last && typed === "" && (
          <Row
            title={last.name}
            subtitle="Last time"
            highlighted
            onSelect={() => start(last)}
          />
        )}

        {results.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {results
              .filter((gym) => !(last && typed === "" && gym.id === last.id))
              .map((gym) => (
                <li key={gym.id}>
                  <Row
                    title={gymLabel(gym)}
                    subtitle={gym.city}
                    onSelect={() => start(toWorkoutGym(gym))}
                  />
                </li>
              ))}
          </ul>
        ) : (
          <Empty gyms={gyms} error={error} paused={fetchStatus === "paused"} typed={typed} />
        )}
      </div>

      <div className="safe-x safe-bottom space-y-2 border-t border-line bg-raised pt-3">
        {/* Offered on the name alone: whether it is already there depends on the branch and
            city too, which are asked for on the next screen, and settled by the API's 409 */}
        {typed.length >= MIN_NAME && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="h-14 w-full truncate rounded-2xl border border-accent px-4 font-semibold text-accent"
          >
            + Add “{typed}”
          </button>
        )}
        {/* Training at home, or somewhere not worth cataloguing, must not be a dead end */}
        <button
          type="button"
          onClick={() => start(null)}
          className="h-14 w-full rounded-2xl border border-line font-semibold"
        >
          Start without a gym
        </button>
      </div>
    </Sheet>
  );
}

function Sheet({ children }: { children: ReactNode }) {
  return <div className="fixed inset-0 z-10 flex h-dvh flex-col bg-surface">{children}</div>;
}

function Row({
  title,
  subtitle,
  highlighted = false,
  onSelect,
}: {
  title: string;
  subtitle: string;
  highlighted?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border bg-raised p-4 text-left ${
        highlighted ? "border-accent" : "border-line"
      }`}
    >
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
    </button>
  );
}

function Empty({
  gyms,
  error,
  paused,
  typed,
}: {
  gyms: Gym[];
  error: Error | null;
  paused: boolean;
  typed: string;
}) {
  if (gyms.length > 0) {
    return <Notice>No gym matches “{typed}”.</Notice>;
  }
  if (paused) {
    return (
      <Notice>
        Offline, and this phone has no copy of the gym list yet. Start without a gym and the
        workout is logged all the same.
      </Notice>
    );
  }
  return <Notice>{error ? error.message : "Loading gyms…"}</Notice>;
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 rounded-2xl border border-line bg-raised p-5 text-sm text-muted">
      {children}
    </p>
  );
}

// A gym is a name, an optional branch and a city. The city is what tells two branches of the
// same chain apart, so the API requires it
function NewGymForm({
  api,
  name,
  gyms,
  onCreated,
  onCancel,
}: {
  api: Api;
  name: string;
  gyms: Gym[];
  onCreated: (gym: WorkoutGym) => void;
  onCancel: () => void;
}) {
  const register = useRegisterGym(api);
  const [branch, setBranch] = useState("");
  const [city, setCity] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const input: NewGym = {
    name,
    branch: branch.trim() === "" ? null : branch.trim(),
    city: city.trim(),
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (input.city === "" || sending) {
      return;
    }

    setSending(true);
    setFailure(null);
    try {
      onCreated(toWorkoutGym(await register(input)));
    } catch (thrown) {
      if (thrown instanceof ApiError && thrown.status === 409) {
        // Somebody else added it first, which is what the shared catalog is for
        const existing = findGym(gyms, input);
        onCreated(
          existing
            ? toWorkoutGym(existing)
            : { id: slugOf(input.name, input.branch, input.city), name: gymLabel(input) },
        );
      } else {
        // Either the API refused it or there is no signal. Neither is worth blocking a
        // workout over: the gym is optional, and starting without one is a tap away
        setFailure(
          thrown instanceof ApiError
            ? thrown.message
            : "No signal. Start without a gym and add this one later.",
        );
        setSending(false);
      }
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="safe-x safe-top flex items-start justify-between gap-4 pb-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">Add to the catalog</p>
          <h2 className="truncate text-2xl font-bold">{name}</h2>
        </div>
        <button type="button" onClick={onCancel} className="h-11 shrink-0 px-2 text-sm text-muted">
          Back
        </button>
      </div>

      <div className="safe-x min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
        <Field
          label="Branch"
          hint="Optional, for a chain with more than one"
          value={branch}
          onChange={setBranch}
        />
        <Field label="City" hint="Required" value={city} onChange={setCity} />
        {failure && <p className="text-sm text-red-300">{failure}</p>}
      </div>

      <div className="safe-x safe-bottom border-t border-line bg-raised pt-3">
        <button
          type="submit"
          disabled={input.city === "" || sending}
          className="h-16 w-full rounded-2xl bg-accent text-lg font-semibold text-surface disabled:opacity-40"
        >
          {sending ? "Adding…" : "Add and start"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <span className="ml-2 text-xs text-muted">{hint}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoCapitalize="words"
        autoCorrect="off"
        enterKeyHint="next"
        className="mt-1 h-14 w-full rounded-2xl border border-line bg-raised px-4"
      />
    </label>
  );
}
