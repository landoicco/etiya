import { describe, expect, it } from "vitest";
import type { CatalogExercise, Exercise } from "@/platform/api";
import { dayCategory, dayCategoryLabel } from "./dayCategory";

const CATALOG: CatalogExercise[] = [
  { id: "barbell-bench-press", name: "Barbell Bench Press", muscleGroup: "CHEST", category: "PUSH" },
  { id: "lat-pulldown", name: "Lat Pulldown", muscleGroup: "BACK", category: "PULL" },
  { id: "barbell-squat", name: "Barbell Squat", muscleGroup: "QUADS", category: "LEGS" },
  { id: "plank", name: "Plank", muscleGroup: "CORE", category: "CORE" },
  { id: "treadmill", name: "Treadmill", muscleGroup: "FULL_BODY", category: "CARDIO" },
];

// An exercise from the catalog with that many sets
function done(name: string, sets: number): Exercise {
  const item = CATALOG.find((exercise) => exercise.name === name);
  return {
    exerciseCatalogItemId: item?.id ?? null,
    name,
    sets: Array.from({ length: sets }, () => ({ count: 10, weight: 20, unit: "KG" as const })),
  };
}

describe("dayCategory", () => {
  it("names the split with the most sets", () => {
    expect(dayCategory([done("Barbell Bench Press", 4), done("Lat Pulldown", 2)], CATALOG)).toEqual([
      "PUSH",
    ]);
  });

  it("names every split tied for the most", () => {
    expect(dayCategory([done("Lat Pulldown", 3), done("Barbell Bench Press", 3)], CATALOG)).toEqual([
      "PUSH",
      "PULL",
    ]);
  });

  it("does not let core or cardio outweigh the split", () => {
    expect(dayCategory([done("Barbell Squat", 2), done("Plank", 5), done("Treadmill", 1)], CATALOG)).toEqual(
      ["LEGS"],
    );
  });

  it("names core or cardio on a day with nothing else", () => {
    expect(dayCategory([done("Plank", 3), done("Treadmill", 1)], CATALOG)).toEqual(["CORE"]);
  });

  it("matches an exercise typed offline by its name", () => {
    const offline = { ...done("Lat Pulldown", 3), exerciseCatalogItemId: null };

    expect(dayCategory([offline], CATALOG)).toEqual(["PULL"]);
  });

  it("leaves out exercises missing from the catalog, and says nothing when that is all", () => {
    expect(dayCategory([done("Costureras", 5), done("Barbell Bench Press", 1)], CATALOG)).toEqual(["PUSH"]);
    expect(dayCategory([done("Costureras", 5)], CATALOG)).toEqual([]);
  });
});

describe("dayCategoryLabel", () => {
  it("joins tied categories, and is empty when none is known", () => {
    expect(dayCategoryLabel([done("Lat Pulldown", 3), done("Barbell Bench Press", 3)], CATALOG)).toBe(
      "Push + Pull",
    );
    expect(dayCategoryLabel([done("Costureras", 5)], CATALOG)).toBe("");
  });
});
