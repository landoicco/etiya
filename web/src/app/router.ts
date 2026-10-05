import { useCallback, useEffect, useMemo, useState } from "react";

// Every screen and sheet is a URL, so the back gesture closes what is on top
export type Route =
  | { name: "home" }
  | { name: "history" }
  | { name: "about" }
  // A workout already saved, opened from the history or from a link
  | { name: "workout"; id: string }
  // Choosing a gym, which is how a workout starts
  | { name: "start" }
  | { name: "logging" }
  | { name: "exercises" }
  // The typed name travels in the history entry rather than the URL: it is a half-finished
  // thought, not something worth linking to
  | { name: "newExercise"; exerciseName: string }
  // The stats of one exercise in the workout, by its identity
  | { name: "exerciseHistory"; exercise: string }
  | { name: "finish" };

export const HOME: Route = { name: "home" };

export function parseRoute(pathname: string, state: unknown): Route {
  const parts = pathname.split("/").filter((part) => part !== "");

  if (parts[0] === "history") {
    return { name: "history" };
  }
  if (parts[0] === "about") {
    return { name: "about" };
  }
  if (parts[0] === "workouts" && parts[1] !== undefined) {
    return { name: "workout", id: parts[1] };
  }
  if (parts[0] === "start") {
    return { name: "start" };
  }
  if (parts[0] === "workout") {
    if (parts[1] === "finish") {
      return { name: "finish" };
    }
    if (parts[1] === "history" && parts[2] !== undefined) {
      return { name: "exerciseHistory", exercise: decodeURIComponent(parts[2]) };
    }
    if (parts[1] === "exercises") {
      return parts[2] === "new"
        ? { name: "newExercise", exerciseName: nameFrom(state) }
        : { name: "exercises" };
    }
    return { name: "logging" };
  }
  return HOME;
}

export function routePath(route: Route): string {
  switch (route.name) {
    case "home":
      return "/";
    case "history":
      return "/history";
    case "about":
      return "/about";
    case "workout":
      return `/workouts/${route.id}`;
    case "start":
      return "/start";
    case "logging":
      return "/workout";
    case "exercises":
      return "/workout/exercises";
    case "newExercise":
      return "/workout/exercises/new";
    case "exerciseHistory":
      return `/workout/history/${encodeURIComponent(route.exercise)}`;
    case "finish":
      return "/workout/finish";
  }
}

export function useRouter() {
  const [route, setRoute] = useState(() => read());

  useEffect(() => {
    const onPopState = () => setRoute(read());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Opening something is a new entry, so the back gesture closes it
  const open = useCallback((next: Route) => {
    window.history.pushState(stateOf(next), "", routePath(next));
    setRoute(next);
  }, []);

  // Closing one is the same as pressing back, so a sheet opened and closed by hand leaves no
  // entry behind for a later back press to land on. Adding an exercise to the catalog opens
  // two entries, the search and the form, and finishing there is done with both
  const close = useCallback((entries = 1) => window.history.go(-entries), []);

  // Replaces the current entry, for a screen the user should not be able to go back into:
  // the workout that has just been saved, or one that is no longer in progress
  const replace = useCallback((next: Route) => {
    window.history.replaceState(stateOf(next), "", routePath(next));
    setRoute(next);
  }, []);

  // One stable object, so an effect that depends on the router does not run on every render
  return useMemo(() => ({ route, open, close, replace }), [route, open, close, replace]);
}

export type Router = ReturnType<typeof useRouter>;

function read(): Route {
  return parseRoute(window.location.pathname, window.history.state);
}

function stateOf(route: Route): unknown {
  return route.name === "newExercise" ? { exerciseName: route.exerciseName } : null;
}

function nameFrom(state: unknown): string {
  const named = state as { exerciseName?: unknown } | null;
  return typeof named?.exerciseName === "string" ? named.exerciseName : "";
}
