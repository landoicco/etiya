import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Api, Page, Workout } from "./api";

// Everything the history reads lives under this key, which is also what the send queue
// invalidates once a workout finally reaches the API
export const WORKOUTS_KEY = ["workouts"];

// Enough to fill a phone screen on the home screen, and a comfortable page in the history
const RECENT = 10;
const PAGE = 20;

export function useRecentWorkouts(api: Api) {
  return useQuery({
    queryKey: [...WORKOUTS_KEY, "recent"],
    queryFn: () => api.listWorkouts(RECENT),
  });
}

export function useWorkoutHistory(api: Api) {
  return useInfiniteQuery({
    queryKey: [...WORKOUTS_KEY, "history"],
    queryFn: ({ pageParam }) => api.listWorkouts(PAGE, pageParam),
    initialPageParam: undefined as string | undefined,
    // The API sends null once there is nothing left, which is how the button knows to go
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useWorkout(api: Api, id: string) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...WORKOUTS_KEY, id],
    queryFn: () => api.getWorkout(id),
    // A workout opened from a list is already in hand, so it appears at once and reads the
    // same with no signal. A stored workout never changes, so there is nothing to refresh
    initialData: () => findLoaded(queryClient, id),
  });
}

function findLoaded(queryClient: QueryClient, id: string): Workout | undefined {
  const recent = queryClient.getQueryData<Page<Workout>>([...WORKOUTS_KEY, "recent"]);
  const history = queryClient.getQueryData<InfiniteData<Page<Workout>>>([
    ...WORKOUTS_KEY,
    "history",
  ]);

  const loaded = [...(recent?.items ?? []), ...(history?.pages.flatMap((page) => page.items) ?? [])];
  return loaded.find((workout) => workout.id === id);
}

export function minutesOf(workout: Workout): number {
  return Math.round((Date.parse(workout.endedAt) - Date.parse(workout.startedAt)) / 60_000);
}

// "45 min" up to an hour, "1 h 15 min" past it, because "95 min" reads as arithmetic
export function durationLabel(workout: Workout): string {
  const minutes = minutesOf(workout);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const rest = minutes % 60;
  return rest === 0 ? `${(minutes - rest) / 60} h` : `${(minutes - rest) / 60} h ${rest} min`;
}

export function totalSets(workout: Workout): number {
  return workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
}

// The line under the date on every card: where, how long, how much
export function summaryLine(workout: Workout): string {
  const exercises = workout.exercises.length;
  return [
    workout.gymName ?? "No gym",
    durationLabel(workout),
    `${exercises} ${exercises === 1 ? "exercise" : "exercises"}`,
  ].join(" · ");
}

// In the phone's own language and time zone, e.g. "Tue, Sep 16, 6:30 PM"
const DAY = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function dayLabel(isoTime: string): string {
  return DAY.format(new Date(isoTime));
}
