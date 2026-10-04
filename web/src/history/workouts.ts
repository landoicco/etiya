import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Api, Page, Workout } from "@/platform/api";

// Everything the history reads lives under this key, which is also what the send queue
// invalidates once a workout finally reaches the API
export const WORKOUTS_KEY = ["workouts"];

// A comfortable page in the history
const PAGE = 20;

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
    // A workout opened from the history is already in hand, so it appears at once and reads
    // the same with no signal. A stored workout never changes, so there is nothing to refresh
    initialData: () => findLoaded(queryClient, id),
  });
}

function findLoaded(queryClient: QueryClient, id: string): Workout | undefined {
  const history = queryClient.getQueryData<InfiniteData<Page<Workout>>>([
    ...WORKOUTS_KEY,
    "history",
  ]);

  return history?.pages.flatMap((page) => page.items).find((workout) => workout.id === id);
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

// Calendar days on the phone's clock, so last night at 11 PM is "yesterday" this morning
export function daysAgo(isoTime: string, now: Date): number {
  // Rounded, because a day with a daylight saving change is not 24 hours long
  return Math.round((midnight(now) - midnight(new Date(isoTime))) / (24 * 60 * 60 * 1000));
}

function midnight(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: "long" });
const DATE = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

// "Today", "Yesterday", "Tuesday, 3 days ago", and the date once it is a week or more
export function agoLabel(isoTime: string, now: Date): string {
  const days = daysAgo(isoTime, now);
  if (days <= 0) {
    return "Today";
  }
  if (days === 1) {
    return "Yesterday";
  }
  const day = days < 7 ? WEEKDAY.format(new Date(isoTime)) : DATE.format(new Date(isoTime));
  return `${day}, ${days} days ago`;
}
