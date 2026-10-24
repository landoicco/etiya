import { describe, expect, it } from "vitest";
import { canGoBack, parentOf, parseRoute, type Route, routePath } from "./router";

const ROUTES: Route[] = [
  { name: "home" },
  { name: "history" },
  { name: "about" },
  { name: "account" },
  { name: "workout", id: "01KZ8BHKC0N761RDSJY0HMX246" },
  { name: "start" },
  { name: "logging" },
  { name: "exercises" },
  { name: "finish" },
  { name: "exerciseHistory", exercise: "barbell-bench-press" },
  { name: "exerciseArt", exercise: "v-bar-lat-pulldown" },
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

describe("canGoBack", () => {
  it("goes back to an entry this page load pushed", () => {
    expect(canGoBack({ load: "a", depth: 1 }, "a", 1)).toBe(true);
    expect(canGoBack({ load: "a", depth: 2, exerciseName: "Landmine Press" }, "a", 2)).toBe(true);
  });

  it("does not go back further than this page load pushed", () => {
    expect(canGoBack({ load: "a", depth: 0 }, "a", 1)).toBe(false);
    expect(canGoBack({ load: "a", depth: 1 }, "a", 2)).toBe(false);
  });

  it("does not trust an entry from an earlier load, which a reload keeps", () => {
    expect(canGoBack({ load: "b", depth: 3 }, "a", 1)).toBe(false);
  });

  it("does not trust an entry with no state, as a link opened from outside has", () => {
    expect(canGoBack(null, "a", 1)).toBe(false);
    expect(canGoBack({ exerciseName: "Landmine Press" }, "a", 1)).toBe(false);
  });
});

describe("parentOf", () => {
  it("lands a workout's sheets on the workout", () => {
    expect(parentOf({ name: "finish" })).toEqual({ name: "logging" });
    expect(parentOf({ name: "exerciseHistory", exercise: "barbell-bench-press" })).toEqual({ name: "logging" });
    expect(parentOf({ name: "newExercise", exerciseName: "" })).toEqual({ name: "logging" });
  });

  it("lands everything else home", () => {
    expect(parentOf({ name: "account" })).toEqual({ name: "home" });
    expect(parentOf({ name: "history" })).toEqual({ name: "home" });
    expect(parentOf({ name: "workout", id: "01KZ8BHKC0N761RDSJY0HMX246" })).toEqual({ name: "home" });
  });
});
