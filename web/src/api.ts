import type { Auth } from "./auth";

// Shapes of the API responses, as core serializes them: empty fields come as null.
// They must stay in sync with the models in core by hand, like the route keys in infra
export type WeightUnit = "KG" | "LB";

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

  return {
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
