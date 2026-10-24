import { describe, expect, it } from "vitest";
import { greeting, initialOf } from "./greeting";

const at = (hour: number, minute = 0) => new Date(2026, 9, 24, hour, minute);

describe("greeting", () => {
  it.each([
    [at(5), "Good morning"],
    [at(11, 59), "Good morning"],
    [at(12), "Good afternoon"],
    [at(18, 59), "Good afternoon"],
    [at(19), "Good evening"],
    [at(0), "Good evening"],
    [at(4, 59), "Good evening"],
  ])("at %s says %s", (now, expected) => {
    expect(greeting(now)).toBe(expected);
  });
});

describe("initialOf", () => {
  it("takes the name first", () => {
    expect(initialOf({ name: "lando", email: "x@example.com" })).toBe("L");
  });

  it("falls back to the email", () => {
    expect(initialOf({ name: null, email: "maria@example.com" })).toBe("M");
  });

  it("is empty when neither is known", () => {
    expect(initialOf({ name: null, email: null })).toBe("");
  });
});
