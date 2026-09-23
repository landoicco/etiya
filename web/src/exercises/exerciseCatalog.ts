import { useQuery, useQueryClient } from "@tanstack/react-query";
import { del, get, set } from "idb-keyval";
import { useCallback } from "react";
import type { Api, CatalogExercise, NewCatalogExercise } from "@/platform/api";

export const CATALOG_KEY = ["exercises"];
const STORED_KEY = "exercise-catalog";

// Read before the first render and seeded into the query cache, so the picker has something
// to show while a fresh copy is on its way
export async function loadCachedCatalog(): Promise<CatalogExercise[] | null> {
  try {
    return (await get<CatalogExercise[]>(STORED_KEY)) ?? null;
  } catch {
    return null;
  }
}

async function saveCatalog(items: CatalogExercise[]): Promise<void> {
  try {
    await set(STORED_KEY, items);
  } catch {
  }
}

// The stored copy holds the exercises this user added, which nobody else may see
export async function forgetCatalog(): Promise<void> {
  try {
    await del(STORED_KEY);
  } catch {
  }
}

export function useExerciseCatalog(api: Api) {
  return useQuery({
    queryKey: CATALOG_KEY,
    queryFn: async () => {
      const page = await api.listExercises();
      void saveCatalog(page.items);
      return page.items;
    },
    // A day, because an exercise somebody else adds is not worth a request per picker open
    staleTime: 24 * 60 * 60 * 1000,
  });
}

// Adds to the catalog and to both copies of it, so the new exercise is in the list on the
// way back without waiting for a refetch
export function useRegisterExercise(api: Api) {
  const queryClient = useQueryClient();

  return useCallback(
    async (input: NewCatalogExercise): Promise<CatalogExercise> => {
      const created = await api.registerExercise(input);
      const items = [...(queryClient.getQueryData<CatalogExercise[]>(CATALOG_KEY) ?? []), created];

      queryClient.setQueryData(CATALOG_KEY, items);
      void saveCatalog(items);
      return created;
    },
    [api, queryClient],
  );
}
