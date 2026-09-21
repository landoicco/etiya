import { useQuery, useQueryClient } from "@tanstack/react-query";
import { get, set } from "idb-keyval";
import { useCallback } from "react";
import type { Api, Gym, NewGym } from "@/platform/api";
import { normalize, slugOf } from "@/exercises/catalog";
import type { WorkoutGym } from "@/workout/workout";

// Same deal as the exercise catalog: one request brings all of it, and the phone keeps a copy
export const GYMS_KEY = ["gyms"];
const STORED_KEY = "gym-catalog";
const LAST_KEY = "last-gym";

export async function loadCachedGyms(): Promise<Gym[] | null> {
  try {
    return (await get<Gym[]>(STORED_KEY)) ?? null;
  } catch {
    return null;
  }
}

async function saveGyms(gyms: Gym[]): Promise<void> {
  try {
    await set(STORED_KEY, gyms);
  } catch {
  }
}

// Per device, not per account: it is about where this phone has been
export async function loadLastGym(): Promise<WorkoutGym | null> {
  try {
    return (await get<WorkoutGym>(LAST_KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function saveLastGym(gym: WorkoutGym): Promise<void> {
  try {
    await set(LAST_KEY, gym);
  } catch {
  }
}

export function useGymCatalog(api: Api) {
  return useQuery({
    queryKey: GYMS_KEY,
    queryFn: async () => {
      const page = await api.listGyms();
      void saveGyms(page.items);
      return page.items;
    },
    // A day: gyms are opened even less often than exercises are invented
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useRegisterGym(api: Api) {
  const queryClient = useQueryClient();

  return useCallback(
    async (input: NewGym): Promise<Gym> => {
      const created = await api.registerGym(input);
      const gyms = [...(queryClient.getQueryData<Gym[]>(GYMS_KEY) ?? []), created];

      queryClient.setQueryData(GYMS_KEY, gyms);
      void saveGyms(gyms);
      return created;
    },
    [api, queryClient],
  );
}

// The id holds name, branch and city, so one match over it finds a gym by any of the three
export function searchGyms(gyms: Gym[], query: string): Gym[] {
  const needle = normalize(query);

  return gyms
    .filter((gym) => needle === "" || gym.id.includes(needle))
    .toSorted(
      (a, b) =>
        Number(b.id.startsWith(needle)) - Number(a.id.startsWith(needle)) ||
        a.id.localeCompare(b.id),
    );
}

// Whether the catalog already holds this gym, which is how a 409 lands on the right one
export function findGym(gyms: Gym[], { name, branch, city }: NewGym): Gym | null {
  const slug = slugOf(name, branch, city);
  return gyms.find((gym) => gym.id === slug) ?? null;
}

// What a member calls the place: the chain plus the branch, if it has one. The city only
// exists to tell two branches apart while searching
export function gymLabel(gym: Pick<Gym, "name" | "branch">): string {
  return gym.branch ? `${gym.name} ${gym.branch}` : gym.name;
}

export function toWorkoutGym(gym: Gym): WorkoutGym {
  return { id: gym.id, name: gymLabel(gym) };
}
