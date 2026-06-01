import { describe, it, expect } from "vitest";
import { resolveDisplayTitle, searchHaystack } from "./title";

describe("resolveDisplayTitle", () => {
  it("returns english when only english is provided", () => {
    expect(resolveDisplayTitle({ english: "Solo Leveling" })).toBe("Solo Leveling");
  });

  it("returns romaji when only romaji is provided", () => {
    expect(resolveDisplayTitle({ romaji: "Ore dake Level Up na Ken" })).toBe(
      "Ore dake Level Up na Ken"
    );
  });

  it("returns english over romaji when both are provided", () => {
    expect(
      resolveDisplayTitle({ english: "Solo Leveling", romaji: "Ore dake Level Up na Ken" })
    ).toBe("Solo Leveling");
  });

  it("returns 'Untitled' when neither english nor romaji is provided", () => {
    expect(resolveDisplayTitle({})).toBe("Untitled");
  });

  it("returns 'Untitled' when native is the only value (native must never be displayed)", () => {
    expect(resolveDisplayTitle({ native: "나 혼자만 레벨업" })).toBe("Untitled");
  });

  it("returns 'Untitled' when all fields are explicitly undefined", () => {
    expect(resolveDisplayTitle({ english: undefined, romaji: undefined, native: undefined })).toBe(
      "Untitled"
    );
  });
});

describe("searchHaystack", () => {
  it("includes english, romaji, and native lowercased joined by space", () => {
    const result = searchHaystack({
      english: "Solo Leveling",
      romaji: "Ore dake Level Up na Ken",
      native: "나 혼자만 레벨업",
    });
    expect(result).toBe("solo leveling ore dake level up na ken 나 혼자만 레벨업");
  });

  it("includes native in haystack even if english and romaji are absent", () => {
    const result = searchHaystack({ native: "나 혼자만 레벨업" });
    expect(result).toBe("나 혼자만 레벨업");
  });

  it("omits missing fields gracefully (english only)", () => {
    expect(searchHaystack({ english: "Solo Leveling" })).toBe("solo leveling");
  });

  it("omits missing fields gracefully (romaji only)", () => {
    expect(searchHaystack({ romaji: "Ore dake Level Up na Ken" })).toBe(
      "ore dake level up na ken"
    );
  });

  it("returns empty string when no fields are provided", () => {
    expect(searchHaystack({})).toBe("");
  });
});
