import type { Auth } from "./auth";

// Shapes of the API responses, as core serializes them: empty fields come as null.
// They must stay in sync with the models in core by hand, like the route keys in infra
// NONE is a set logged without weight, like pull-ups, and forces weight to 0
export type WeightUnit = "KG" | "LB" | "NONE";

// Both lists are fixed by the API, which answers a value outside them with a 400 naming the
// accepted ones. They are written in the same order the API documents them
export type MuscleGroup =
  | "CHEST"
  | "BACK"
  | "SHOULDERS"
  | "BICEPS"
  | "TRICEPS"
  | "FOREARMS"
  | "QUADS"
  | "HAMSTRINGS"
  | "GLUTES"
  | "CALVES"
  | "CORE"
  | "FULL_BODY";

export type ExerciseCategory = "PUSH" | "PULL" | "LEGS" | "CORE" | "CARDIO" | "OTHER";

// An exercise in the catalog every user shares. Its id is the slug of its name
export interface CatalogExercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  category: ExerciseCategory;
}

export type NewCatalogExercise = Omit<CatalogExercise, "id">;

// A gym in the catalog every user shares. Its id is the slug of the three fields together,
// so a chain's branches all start with the chain's name. branch is null for an independent gym
export interface Gym {
  id: string;
  name: string;
  branch: string | null;
  city: string;
}

export type NewGym = Omit<Gym, "id">;

export interface GymSet {
  count: number;
  weight: number;
  unit: WeightUnit;
}

export interface Exercise {
  exerciseCatalogItemId: string | null;
  name: string;
  sets: GymSet[];
}

export interface Workout {
  id: string;
  userId: string;
  // UTC, as yyyy-MM-ddTHH:mm:ssZ
  startedAt: string;
  endedAt: string;
  gymId: string | null;
  gymName: string | null;
  exercises: Exercise[];
}

// nextCursor is null when there is nothing left to fetch
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export class ApiError extends Error {
  readonly status: number;
  // The API's error code, like GYM_NOT_FOUND. API Gateway's own 401 has none
  readonly code: string | null;

  constructor(status: number, code: string | null, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export type Api = ReturnType<typeof createApi>;

export function createApi(apiUrl: string, auth: Auth) {
  async function get<T>(path: string): Promise<T> {
    const response = await fetch(apiUrl + path, {
      headers: { Authorization: `Bearer ${await auth.getAccessToken()}` },
    });
    if (!response.ok) {
      throw await toApiError(response);
    }
    return (await response.json()) as T;
  }

  async function post<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(apiUrl + path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await auth.getAccessToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw await toApiError(response);
    }
    return (await response.json()) as T;
  }

  return {
    // The whole catalog in one response: neither route takes a limit nor sends a cursor, so
    // the app downloads each once and searches it on the phone
    listExercises(): Promise<Page<CatalogExercise>> {
      return get("/exercises");
    },

    listGyms(): Promise<Page<Gym>> {
      return get("/gyms");
    },

    // 409 when a gym with the same slug is already there, which is not an error for the app:
    // it means somebody else added it first
    registerGym(gym: NewGym): Promise<Gym> {
      return post("/gyms", gym);
    },

    // 409 when an exercise with the same slug is already there, which is not an error for
    // the app: it means somebody else added it first
    registerExercise(exercise: NewCatalogExercise): Promise<CatalogExercise> {
      return post("/exercises", exercise);
    },

    // Newest first
    listWorkouts(limit: number, cursor?: string): Promise<Page<Workout>> {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) {
        params.set("cursor", cursor);
      }
      return get(`/me/workouts?${params}`);
    },
  };
}

// The API answers errors with { error, message }; anything else keeps the HTTP status
async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    message?: string;
  } | null;
  return new ApiError(
    response.status,
    body?.error ?? null,
    body?.message ?? `Request failed with HTTP ${response.status}`,
  );
}
