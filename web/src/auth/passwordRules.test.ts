import { describe, expect, it } from "vitest";
import { meetsPolicy, passwordRules } from "./passwordRules";

function unmet(password: string): string[] {
  return passwordRules(password)
    .filter((rule) => !rule.met)
    .map((rule) => rule.label);
}

describe("passwordRules", () => {
  it("names every rule an empty password misses", () => {
    expect(unmet("")).toHaveLength(5);
  });

  it("accepts a password that meets the whole policy", () => {
    expect(unmet("Squat-2026")).toEqual([]);
    expect(meetsPolicy("Squat-2026")).toBe(true);
  });

  it.each([
    ["Sq-26ab", "8 characters or more"],
    ["squat-2026", "An uppercase letter"],
    ["SQUAT-2026", "A lowercase letter"],
    ["Squat-press", "A number"],
    ["Squat2026", "A symbol, like ! or #"],
  ])('says what "%s" is missing', (password, rule) => {
    expect(unmet(password)).toEqual([rule]);
    expect(meetsPolicy(password)).toBe(false);
  });

  // Cognito would refuse these, so the checklist must not tick them
  it("counts only the letters and symbols Cognito counts", () => {
    expect(unmet("ÑANDÚ-2026")).toContain("A lowercase letter");
    expect(unmet("ñandu-2026")).toContain("An uppercase letter");
    expect(unmet("Squat2026¡")).toContain("A symbol, like ! or #");
  });
});
