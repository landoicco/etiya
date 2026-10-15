import { useQuery } from "@tanstack/react-query";

// The art is not in the repo: each deployment uploads its own, with an index of what it has
const ART_INDEX = "/art/exercises/index.json";

export function artUrl(exerciseId: string): string {
  return `/art/exercises/${encodeURIComponent(exerciseId)}.svg`;
}

// Without art, CloudFront answers with index.html, so anything but a list of ids means none
export function parseArtIndex(text: string): Set<string> {
  try {
    const ids: unknown = JSON.parse(text);
    return Array.isArray(ids) ? new Set(ids.filter((id) => typeof id === "string")) : new Set();
  } catch {
    return new Set();
  }
}

// The ids that have a picture. Once per launch; offline, the service worker has the last one
export function useExerciseArt() {
  const { data } = useQuery({
    queryKey: ["exercise-art"],
    queryFn: async () => parseArtIndex(await (await fetch(ART_INDEX)).text()),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  return data ?? new Set<string>();
}
