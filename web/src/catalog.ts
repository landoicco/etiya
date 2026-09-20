import type { CatalogExercise, ExerciseCategory, MuscleGroup } from "./api";

// The chips over the search box, in the order of the push/pull/legs split they come from
export const CATEGORIES: ExerciseCategory[] = ["PUSH", "PULL", "LEGS", "CORE", "CARDIO", "OTHER"];

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  PUSH: "Push",
  PULL: "Pull",
  LEGS: "Legs",
  CORE: "Core",
  CARDIO: "Cardio",
  OTHER: "Other",
};

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "FOREARMS",
  "QUADS",
  "HAMSTRINGS",
  "GLUTES",
  "CALVES",
  "CORE",
  "FULL_BODY",
];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  CHEST: "Chest",
  BACK: "Back",
  SHOULDERS: "Shoulders",
  BICEPS: "Biceps",
  TRICEPS: "Triceps",
  FOREARMS: "Forearms",
  QUADS: "Quads",
  HAMSTRINGS: "Hamstrings",
  GLUTES: "Glutes",
  CALVES: "Calves",
  CORE: "Core",
  FULL_BODY: "Full body",
};

export interface CatalogFilter {
  query: string;
  // null is the "All" chip
  category: ExerciseCategory | null;
}

// The same normalization the API applies to build an exercise's id, step by step: accents
// split and their marks dropped, apostrophes joining words, anything else separating them.
// It has to agree with Slugs.of in core, because the id of an exercise is the slug of its
// name, and that is how the app recognizes one the API says already exists
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Anywhere in the name, not just the start: "press" should find the incline bench press,
// which is the part of the name somebody remembers. Names that do start with what was typed
// come first, and the rest are alphabetical
export function searchCatalog(
  items: CatalogExercise[],
  { query, category }: CatalogFilter,
): CatalogExercise[] {
  const needle = normalize(query);

  return items
    .map((item) => ({ item, slug: normalize(item.name) }))
    .filter(
      ({ item, slug }) =>
        (category === null || item.category === category) &&
        (needle === "" || slug.includes(needle)),
    )
    .toSorted(
      (a, b) =>
        Number(b.slug.startsWith(needle)) - Number(a.slug.startsWith(needle)) ||
        a.item.name.localeCompare(b.item.name),
    )
    .map(({ item }) => item);
}

// Whether the catalog already holds what was typed, whatever it was typed like. Used to hide
// the "add" row, and to land on the existing exercise when the API answers 409
export function findByName(items: CatalogExercise[], name: string): CatalogExercise | null {
  const slug = normalize(name);
  return items.find((item) => item.id === slug) ?? null;
}
