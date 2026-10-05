// Must match Slugs.of in core step by step: accents dropped, apostrophes joining words,
// anything else separating them. A catalog item's id is the slug of its name
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// The same from several parts, which is how a gym's id is built out of its name, branch and
// city. Parts that are missing or blank are skipped, exactly as the API skips them
export function slugOf(...parts: (string | null | undefined)[]): string {
  return normalize(parts.filter((part) => part != null && part.trim() !== "").join(" "));
}
