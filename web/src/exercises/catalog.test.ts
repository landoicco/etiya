import { describe, expect, it } from "vitest";
import type { CatalogExercise } from "@/platform/api";
import { findByName, searchCatalog } from "./catalog";

function exercise(id: string, name: string, category: CatalogExercise["category"]): CatalogExercise {
  return { id, name, muscleGroup: "CHEST", category };
}

const CATALOG: CatalogExercise[] = [
  exercise("barbell-bench-press", "Barbell Bench Press", "PUSH"),
  exercise("incline-bench-press", "Incline Bench Press", "PUSH"),
  exercise("bench-dip", "Bench Dip", "PUSH"),
  exercise("bent-over-row", "Bent Over Row", "PULL"),
  exercise("barbell-squat", "Barbell Squat", "LEGS"),
];

function names(items: CatalogExercise[]): string[] {
  return items.map((item) => item.name);
}

describe("searchCatalog", () => {
  const all = { query: "", category: null };

  it("returns everything alphabetically when nothing is typed", () => {
    expect(names(searchCatalog(CATALOG, all))).toEqual([
      "Barbell Bench Press",
      "Barbell Squat",
      "Bench Dip",
      "Bent Over Row",
      "Incline Bench Press",
    ]);
  });

  it("matches anywhere in the name, not only at the start", () => {
    expect(names(searchCatalog(CATALOG, { ...all, query: "press" }))).toEqual([
      "Barbell Bench Press",
      "Incline Bench Press",
    ]);
  });

  it("puts the names that start with what was typed first", () => {
    expect(names(searchCatalog(CATALOG, { ...all, query: "bench" }))).toEqual([
      "Bench Dip",
      "Barbell Bench Press",
      "Incline Bench Press",
    ]);
  });

  it("ignores case, accents and spacing, like the catalog's own ids", () => {
    expect(names(searchCatalog(CATALOG, { ...all, query: "  BÉNCH  " }))).toEqual(
      names(searchCatalog(CATALOG, { ...all, query: "bench" })),
    );
  });

  it("narrows to one category, and combines it with the text", () => {
    expect(names(searchCatalog(CATALOG, { query: "", category: "PULL" }))).toEqual([
      "Bent Over Row",
    ]);
    expect(names(searchCatalog(CATALOG, { query: "barbell", category: "LEGS" }))).toEqual([
      "Barbell Squat",
    ]);
  });

  it("finds nothing rather than everything when there is no match", () => {
    expect(searchCatalog(CATALOG, { ...all, query: "deadlift" })).toEqual([]);
  });
});

describe("findByName", () => {
  it("recognizes an exercise the catalog already holds, however it was typed", () => {
    expect(findByName(CATALOG, "  barbell bench press ")?.id).toBe("barbell-bench-press");
    expect(findByName(CATALOG, "Barbell  Bench  Press")?.id).toBe("barbell-bench-press");
  });

  it("does not match a name that is merely contained in another", () => {
    expect(findByName(CATALOG, "Bench Press")).toBeNull();
  });
});
