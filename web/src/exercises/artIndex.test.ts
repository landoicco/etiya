import { describe, expect, it } from "vitest";
import { artUrl, parseArtIndex } from "./artIndex";

describe("parseArtIndex", () => {
  it("reads each exercise id with its description", () => {
    expect(parseArtIndex('{"back-squat": "Bar on the upper back.", "dip": ""}')).toEqual(
      new Map([
        ["back-squat", "Bar on the upper back."],
        ["dip", ""],
      ]),
    );
  });

  it("finds no art in the page CloudFront serves for a missing file", () => {
    expect(parseArtIndex("<!doctype html><html></html>")).toEqual(new Map());
  });

  it("finds no art in JSON of another shape, and skips entries that are not text", () => {
    expect(parseArtIndex('["back-squat"]')).toEqual(new Map());
    expect(parseArtIndex("null")).toEqual(new Map());
    expect(parseArtIndex('{"back-squat": "Squat.", "dip": 3}')).toEqual(
      new Map([["back-squat", "Squat."]]),
    );
  });
});

describe("artUrl", () => {
  it("names the file after the exercise id", () => {
    expect(artUrl("v-bar-lat-pulldown")).toBe("/art/exercises/v-bar-lat-pulldown.svg");
  });
});
