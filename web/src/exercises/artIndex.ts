import { useQuery } from "@tanstack/react-query";

// The art is not in the repo: each deployment uploads its own, with an index of what it has
const ART_INDEX = "/art/exercises/index.json";

export function artUrl(exerciseId: string): string {
  return `/art/exercises/${encodeURIComponent(exerciseId)}.svg`;
}

// Exercise id → a short description shown under its picture. Without art, CloudFront answers
// with index.html, so anything but an object of strings means none
export function parseArtIndex(text: string): Map<string, string> {
  try {
    const index: unknown = JSON.parse(text);
    if (typeof index !== "object" || index === null || Array.isArray(index)) {
      return new Map();
    }
    return new Map(
      Object.entries(index).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    );
  } catch {
    return new Map();
  }
}

// Which exercises have a picture. Once per launch; offline, the service worker has the last one
export function useExerciseArt() {
  const { data } = useQuery({
    queryKey: ["exercise-art"],
    queryFn: async () => parseArtIndex(await (await fetch(ART_INDEX)).text()),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  return data ?? new Map<string, string>();
}
