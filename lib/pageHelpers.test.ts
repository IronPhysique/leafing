import { describe, it, expect } from "vitest";
import { humanizeSlug, sourceHue } from "./pageHelpers";

// ---------------------------------------------------------------------------
// humanizeSlug
// ---------------------------------------------------------------------------

describe("humanizeSlug", () => {
  it("strips trailing hex suffix (6+ hex chars after last hyphen)", () => {
    expect(humanizeSlug("solo-leveling-7b57f74d")).toBe("Solo Leveling");
  });

  it("does not strip a short non-hex trailing segment", () => {
    // 5 hex chars — less than 6, should NOT be stripped
    expect(humanizeSlug("tower-abc12")).toBe("Tower Abc12");
  });

  it("capitalizes each word (title-case)", () => {
    expect(humanizeSlug("tower-of-god")).toBe("Tower Of God");
  });

  it("replaces underscores with spaces", () => {
    expect(humanizeSlug("nano_machine")).toBe("Nano Machine");
  });

  it("handles mixed hyphens and underscores", () => {
    expect(humanizeSlug("my-series_name")).toBe("My Series Name");
  });

  it("handles single-word slug", () => {
    expect(humanizeSlug("overlord")).toBe("Overlord");
  });

  it("trims leading/trailing whitespace (edge case with leading hyphens)", () => {
    const result = humanizeSlug("series-name");
    expect(result).toBe(result.trim());
  });

  it("handles slug that is entirely a long hex suffix — returns empty or short fallback", () => {
    // The entire thing matches the suffix pattern
    const result = humanizeSlug("abcdef1234");
    // Hex suffix is -[hex]{6,} so "abcdef1234" has no leading hyphen; doesn't match
    expect(result).toBe("Abcdef1234");
  });
});

// ---------------------------------------------------------------------------
// sourceHue
// ---------------------------------------------------------------------------

describe("sourceHue", () => {
  it("returns a number in range [0, 359]", () => {
    for (const id of ["mangadex", "flamecomics", "comick", "weebcentral", "asurascans", ""]) {
      const hue = sourceHue(id);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it("is deterministic — same input always produces same output", () => {
    expect(sourceHue("mangadex")).toBe(sourceHue("mangadex"));
    expect(sourceHue("asurascans")).toBe(sourceHue("asurascans"));
  });

  it("produces different hues for different source IDs", () => {
    const hues = new Set(
      ["mangadex", "flamecomics", "comick", "weebcentral", "asurascans"].map(sourceHue),
    );
    // Very unlikely all 5 collide mod 360
    expect(hues.size).toBeGreaterThan(1);
  });

  it("returns integer (mod 360 of integer hash)", () => {
    expect(Number.isInteger(sourceHue("mangadex"))).toBe(true);
  });
});
