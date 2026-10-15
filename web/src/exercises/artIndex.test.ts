import { describe, expect, it } from "vitest";
import { artUrl, parseArtIndex } from "./artIndex";

describe("parseArtIndex", () => {
  it("reads a list of exercise ids", () => {
    expect(parseArtIndex('["back-squat", "barbell-bench-press"]')).toEqual(
      new Set(["back-squat", "barbell-bench-press"]),
    );
  });

  it("finds no art in the page CloudFront serves for a missing file", () => {
    expect(parseArtIndex("<!doctype html><html></html>")).toEqual(new Set());
  });

  it("finds no art in JSON of another shape, and skips ids that are not strings", () => {
    expect(parseArtIndex('{"ids": ["back-squat"]}')).toEqual(new Set());
    expect(parseArtIndex('["back-squat", 3, null]')).toEqual(new Set(["back-squat"]));
  });
});

describe("artUrl", () => {
  it("names the file after the exercise id", () => {
    expect(artUrl("v-bar-lat-pulldown")).toBe("/art/exercises/v-bar-lat-pulldown.svg");
  });
});
