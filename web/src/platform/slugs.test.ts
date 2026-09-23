import { describe, expect, it } from "vitest";
import { normalize, slugOf } from "./slugs";

// The cases below are copied from SlugsTest in core, the odd ones included. A catalog item's
// id is the slug of its name, so if these two ever disagree the app stops recognizing items
// the catalog already holds, and starts offering to add them again
describe("normalize", () => {
  it.each([
    ["Querétaro", "queretaro"],
    ["Año Nuevo", "ano-nuevo"],
    ["Gold's Gym", "golds-gym"],
    ["Gold’s Gym", "golds-gym"],
    ["  Farmer's Walk (Básico)", "farmers-walk-basico"],
    ["Smart   Fit -- Centro!", "smart-fit-centro"],
    ["5x5 Program", "5x5-program"],
  ])('builds the same slug the API does: "%s"', (name, slug) => {
    expect(normalize(name)).toBe(slug);
  });

  it.each([
    ["Straße", "stra-e"],
    ["Smart Fit Øresund", "smart-fit-resund"],
    ["Жим лёжа", ""],
    ["!!!", ""],
  ])('drops what the API drops: "%s"', (name, slug) => {
    expect(normalize(name)).toBe(slug);
  });

  it("joins several parts and skips the ones that are missing or blank", () => {
    expect(slugOf("Smart Fit", "Valle Oriente", "Monterrey")).toBe(
      "smart-fit-valle-oriente-monterrey",
    );
    expect(slugOf("Smart Fit", null, "Monterrey")).toBe("smart-fit-monterrey");
    expect(slugOf("Smart Fit", "  ", "Monterrey")).toBe("smart-fit-monterrey");
  });

  it("matches a prefix of the full id, which is how the API's own search works", () => {
    const id = normalize("Barbell Bench Press");

    expect(id.startsWith(normalize("Barbell Ben"))).toBe(true);
    expect(id.startsWith(normalize("  BARBELL bénch "))).toBe(true);
  });
});
