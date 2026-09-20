import { describe, expect, it } from "vitest";
import { parentOf, parseRoute, type Route, routePath } from "./router";

const ROUTES: Route[] = [
  { name: "home" },
  { name: "history" },
  { name: "workout", id: "01KZ8BHKC0N761RDSJY0HMX246" },
  { name: "start" },
  { name: "logging" },
  { name: "exercises" },
  { name: "finish" },
];

describe("parseRoute and routePath", () => {
  it.each(ROUTES)("round-trips $name", (route) => {
    expect(parseRoute(routePath(route), null)).toEqual(route);
  });

  it("carries the typed name in the history entry, not in the path", () => {
    const route: Route = { name: "newExercise", exerciseName: "Landmine Press" };

    expect(routePath(route)).toBe("/workout/exercises/new");
    expect(parseRoute(routePath(route), { exerciseName: "Landmine Press" })).toEqual(route);
  });

  it("survives an entry whose state was lost, which a reload does", () => {
    expect(parseRoute("/workout/exercises/new", null)).toEqual({
      name: "newExercise",
      exerciseName: "",
    });
  });

  it("ignores trailing and repeated slashes", () => {
    expect(parseRoute("/history/", null)).toEqual({ name: "history" });
    expect(parseRoute("//workout//exercises//", null)).toEqual({ name: "exercises" });
  });

  it("sends anything it does not know home, so a stale link still opens the app", () => {
    expect(parseRoute("/", null)).toEqual({ name: "home" });
    expect(parseRoute("/nonsense", null)).toEqual({ name: "home" });
    expect(parseRoute("/workouts", null)).toEqual({ name: "home" });
  });
});

describe("parentOf", () => {
  it("walks the sheets back one layer at a time", () => {
    expect(parentOf({ name: "newExercise", exerciseName: "X" })).toEqual({ name: "exercises" });
    expect(parentOf({ name: "exercises" })).toEqual({ name: "logging" });
    expect(parentOf({ name: "finish" })).toEqual({ name: "logging" });
  });

  it("takes a saved workout back to the history it was opened from", () => {
    expect(parentOf({ name: "workout", id: "abc" })).toEqual({ name: "history" });
  });

  it("sends the top-level screens home", () => {
    expect(parentOf({ name: "start" })).toEqual({ name: "home" });
    expect(parentOf({ name: "history" })).toEqual({ name: "home" });
  });
});
