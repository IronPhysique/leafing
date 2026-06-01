import { describe, it, expect } from "vitest";
import { coverVtName } from "./vt";

describe("coverVtName", () => {
  it("prepends 'cover-' to the key", () => {
    expect(coverVtName("mangadex/abc-123")).toMatch(/^cover-/);
  });

  it("replaces non-alphanumeric characters with hyphens", () => {
    expect(coverVtName("mangadex/abc-123")).toBe("cover-mangadex-abc-123");
  });

  it("handles a plain alphanumeric key unchanged (except prefix)", () => {
    expect(coverVtName("abc123")).toBe("cover-abc123");
  });

  it("replaces slashes, dots, and spaces with hyphens", () => {
    expect(coverVtName("foo/bar.baz qux")).toBe("cover-foo-bar-baz-qux");
  });

  it("truncates the key part to 80 characters total after prefix", () => {
    const longKey = "a".repeat(100);
    const result = coverVtName(longKey);
    // "cover-" is 6 chars, key part sliced to 80 → total 86 chars max
    // Actually: key.replace(...).slice(0, 80) → result is "cover-" + 80 chars
    expect(result.length).toBe("cover-".length + 80);
  });

  it("a short key is not padded", () => {
    expect(coverVtName("x")).toBe("cover-x");
  });

  it("empty string results in 'cover-'", () => {
    expect(coverVtName("")).toBe("cover-");
  });

  it("key with only special chars becomes all hyphens", () => {
    expect(coverVtName("!!!")).toBe("cover----");
  });
});
