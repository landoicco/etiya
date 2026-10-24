import { type FormEvent, useState } from "react";
import {
  type Api,
  ApiError,
  type CatalogExercise,
  type ExerciseCategory,
  type MuscleGroup,
} from "@/platform/api";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  findByName,
  MUSCLE_GROUP_LABELS,
  MUSCLE_GROUPS,
  searchCatalog,
} from "./catalog";
import { normalize } from "@/platform/slugs";
import { Button } from "@/ui/Button";
import { SearchField } from "@/ui/SearchField";
import { useExerciseCatalog, useRegisterExercise } from "./exerciseCatalog";
import { useExerciseArt } from "./artIndex";
import { ArtSheet, ArtThumbnail } from "./ExerciseArt";
import type { Router } from "@/app/router";
import type { ExerciseChoice } from "@/workout/workout";

interface Props {
  api: Api;
  router: Router;
  onPick: (choice: ExerciseChoice) => void;
}

// The API refuses a name shorter than this, so there is no point offering to add one
const MIN_NAME = 2;

// Covers the workout while it is open. Searching is the common case and adding is the rare
// one, so the search is what the screen opens on, with the keyboard already up
export function ExercisePicker({ api, router, onPick }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ExerciseCategory | null>(null);

  const { data, error, fetchStatus } = useExerciseCatalog(api);
  const art = useExerciseArt();
  const catalog = data ?? [];
  const typed = query.trim();
  const results = searchCatalog(catalog, { query, category });
  const { route } = router;
  // Missing for a link to an exercise this phone does not know, which then shows nothing
  const inArt =
    route.name === "exerciseArt" ? catalog.find((item) => item.id === route.exercise) : undefined;

  // Adding is its own entry, so the back gesture returns to the search rather than closing
  // the picker. The name travels in the entry, since a reload has nothing else to go on
  if (router.route.name === "newExercise") {
    return (
      <Sheet>
        <NewExercise
          api={api}
          name={router.route.exerciseName}
          catalog={catalog}
          onCreated={onPick}
          onCancel={router.close}
        />
      </Sheet>
    );
  }

  return (
    <Sheet>
      <div className="safe-x safe-top flex gap-2 pb-3">
        <SearchField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search exercises"
          aria-label="Search exercises"
          // Searching is the reason this screen was opened, so it takes the keyboard
          // straight away rather than asking for one more tap
          autoFocus
          className="flex-1"
        />
        <button
          type="button"
          onClick={() => router.close()}
          className="h-14 shrink-0 px-2 text-sm text-muted"
        >
          Cancel
        </button>
      </div>

      <div className="safe-x flex gap-2 overflow-x-auto pb-3">
        <Chip label="All" selected={category === null} onSelect={() => setCategory(null)} />
        {CATEGORIES.map((option) => (
          <Chip
            key={option}
            label={CATEGORY_LABELS[option]}
            selected={category === option}
            onSelect={() => setCategory(category === option ? null : option)}
          />
        ))}
      </div>

      <div className="safe-x min-h-0 flex-1 overflow-y-auto">
        {results.length > 0 ? (
          <ul className="space-y-2 pt-1 pb-4">
            {results.map((item) => (
              <li key={item.id}>
                <ExerciseRow
                  item={item}
                  hasArt={art.has(item.id)}
                  onSelect={() => onPick({ exerciseCatalogItemId: item.id, name: item.name })}
                  onShowArt={() => router.open({ name: "exerciseArt", exercise: item.id })}
                />
              </li>
            ))}
          </ul>
        ) : (
          <Empty catalog={catalog} error={error} paused={fetchStatus === "paused"} typed={typed} />
        )}
      </div>

      {typed.length >= MIN_NAME && findByName(catalog, typed) === null && (
        <div className="safe-x safe-bottom border-t border-line bg-raised pt-3">
          <Button variant="accent" onClick={() => router.open({ name: "newExercise", exerciseName: typed })}>
            + Add “{typed}”
          </Button>
        </div>
      )}

      {inArt && (
        <ArtSheet
          exerciseId={inArt.id}
          name={inArt.name}
          description={art.get(inArt.id) ?? ""}
          onClose={() => router.close()}
        />
      )}
    </Sheet>
  );
}

function Sheet({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-10 flex h-dvh flex-col bg-surface">{children}</div>;
}

// The name adds the exercise and the picture opens it larger: two targets, so looking never adds.
// Without a picture the row is the name alone, the same as before there were any
function ExerciseRow({
  item,
  hasArt,
  onSelect,
  onShowArt,
}: {
  item: CatalogExercise;
  hasArt: boolean;
  onSelect: () => void;
  onShowArt: () => void;
}) {
  return (
    <div className="flex items-center rounded-card border border-line bg-raised shadow-card">
      {hasArt && (
        <button
          type="button"
          onClick={onShowArt}
          aria-label={`Show ${item.name}`}
          className="shrink-0 py-2 pl-2"
        >
          <ArtThumbnail exerciseId={item.id} />
        </button>
      )}
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 py-3.5 pr-4 pl-4 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{item.name}</span>
          <span className="mt-0.5 block text-sm text-muted">
            {MUSCLE_GROUP_LABELS[item.muscleGroup]} · {CATEGORY_LABELS[item.category]}
          </span>
        </span>
        <span aria-hidden="true" className="text-2xl text-accent-ink">
          +
        </span>
      </button>
    </div>
  );
}

// Nothing to show has three quite different reasons, and the way out of each is different
function Empty({
  catalog,
  error,
  paused,
  typed,
}: {
  catalog: CatalogExercise[];
  error: Error | null;
  paused: boolean;
  typed: string;
}) {
  if (catalog.length > 0) {
    return <Notice>No exercise matches “{typed}”. Add it and it is saved to your own list.</Notice>;
  }
  if (paused) {
    return (
      <Notice>
        Offline, and this phone has no copy of the catalog yet. Type a name and add it: the
        workout keeps it either way.
      </Notice>
    );
  }
  return <Notice>{error ? error.message : "Loading the catalog…"}</Notice>;
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-card border border-line bg-raised p-5 text-sm text-muted shadow-card">{children}</p>
  );
}

// A second screen, because the API requires both choices; the exercise is private to this user
function NewExercise({
  api,
  name,
  catalog,
  onCreated,
  onCancel,
}: {
  api: Api;
  name: string;
  catalog: CatalogExercise[];
  onCreated: (choice: ExerciseChoice) => void;
  onCancel: () => void;
}) {
  const register = useRegisterExercise(api);
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | null>(null);
  const [category, setCategory] = useState<ExerciseCategory | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (muscleGroup === null || category === null || sending) {
      return;
    }

    setSending(true);
    setFailure(null);
    try {
      const created = await register({ name, muscleGroup, category });
      onCreated({ exerciseCatalogItemId: created.id, name: created.name });
    } catch (thrown) {
      if (thrown instanceof ApiError && thrown.status === 409) {
        // Already in the shared catalog or in this user's own: the id is the slug of the name,
        // so the existing one is the one meant
        const existing = findByName(catalog, name);
        onCreated({ exerciseCatalogItemId: existing?.id ?? normalize(name), name });
      } else if (thrown instanceof ApiError) {
        setFailure(thrown.message);
        setSending(false);
      } else {
        // No signal. The workout carries the name, and the set logging goes on
        onCreated({ exerciseCatalogItemId: null, name });
      }
    }
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="safe-x safe-top flex items-start justify-between gap-4 pb-3">
        <div className="min-w-0">
          <p className="text-sm text-muted">Add to the catalog</p>
          <h2 className="truncate text-2xl font-bold tracking-tight">{name}</h2>
        </div>
        <button type="button" onClick={onCancel} className="h-11 shrink-0 px-2 text-sm text-muted">
          Back
        </button>
      </div>

      <div className="safe-x min-h-0 flex-1 overflow-y-auto pb-4">
        <Choices
          legend="Muscle group"
          options={MUSCLE_GROUPS}
          labels={MUSCLE_GROUP_LABELS}
          selected={muscleGroup}
          onSelect={setMuscleGroup}
        />
        <Choices
          legend="Category"
          options={CATEGORIES}
          labels={CATEGORY_LABELS}
          selected={category}
          onSelect={setCategory}
        />
        {failure && <p className="mt-4 text-sm text-danger">{failure}</p>}
      </div>

      <div className="safe-x safe-bottom border-t border-line bg-raised pt-3">
        <Button type="submit" disabled={muscleGroup === null || category === null || sending}>
          {sending ? "Adding…" : "Add exercise"}
        </Button>
      </div>
    </form>
  );
}

// A grid of taps rather than a dropdown: every option is visible at once, and each one is a
// target a thumb can hit
function Choices<T extends string>({
  legend,
  options,
  labels,
  selected,
  onSelect,
}: {
  legend: string;
  options: T[];
  labels: Record<T, string>;
  selected: T | null;
  onSelect: (option: T) => void;
}) {
  return (
    <fieldset className="mt-4 border-0 p-0">
      <legend className="text-xs font-bold tracking-wider text-muted uppercase">{legend}</legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            aria-pressed={option === selected}
            className={`h-12 rounded-[14px] border px-1 text-sm font-semibold ${
              option === selected ? "border-ink bg-ink text-surface" : "border-line bg-raised text-muted"
            }`}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Chip({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold ${
        selected ? "border-ink bg-ink text-surface" : "border-line text-muted"
      }`}
    >
      {label}
    </button>
  );
}
