import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Import after mocking
let searchTitle: (query: string) => Promise<{ anilistId: number; english?: string; romaji?: string; native?: string } | null>;

function makeResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(body),
  } as Response);
}

describe("AniList MetadataSource contract", () => {
  beforeEach(async () => {
    vi.stubGlobal("fetch", vi.fn());
    // Re-import each time so module uses the stubbed fetch
    const mod = await import("./anilist");
    searchTitle = mod.default.searchTitle.bind(mod.default);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("valid payload maps id + all three titles", async () => {
    vi.mocked(fetch).mockReturnValue(
      makeResponse({
        data: {
          Media: {
            id: 85670,
            title: {
              english: "Solo Leveling",
              romaji: "Ore dake Level Up na Ken",
              native: "나 혼자만 레벨업",
            },
          },
        },
      })
    );

    const result = await searchTitle("Solo Leveling");
    expect(result).toEqual({
      anilistId: 85670,
      english: "Solo Leveling",
      romaji: "Ore dake Level Up na Ken",
      native: "나 혼자만 레벨업",
    });
  });

  it("missing english still maps romaji and native", async () => {
    vi.mocked(fetch).mockReturnValue(
      makeResponse({
        data: {
          Media: {
            id: 12345,
            title: {
              english: null,
              romaji: "Berserk",
              native: "ベルセルク",
            },
          },
        },
      })
    );

    const result = await searchTitle("Berserk");
    expect(result).not.toBeNull();
    expect(result!.anilistId).toBe(12345);
    expect(result!.english).toBeUndefined();
    expect(result!.romaji).toBe("Berserk");
    expect(result!.native).toBe("ベルセルク");
  });

  it("Media: null => returns null", async () => {
    vi.mocked(fetch).mockReturnValue(
      makeResponse({
        data: { Media: null },
      })
    );

    const result = await searchTitle("nonexistent series zzz");
    expect(result).toBeNull();
  });

  it("malformed response (missing data key) => returns null", async () => {
    vi.mocked(fetch).mockReturnValue(
      makeResponse({ errors: [{ message: "Not found" }] })
    );

    const result = await searchTitle("bad query");
    expect(result).toBeNull();
  });

  it("fetch throws network error => returns null (graceful degradation)", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network failure"));

    const result = await searchTitle("anything");
    expect(result).toBeNull();
  });

  it("all title fields null => returns entry with anilistId but all titles undefined", async () => {
    vi.mocked(fetch).mockReturnValue(
      makeResponse({
        data: {
          Media: {
            id: 99,
            title: {
              english: null,
              romaji: null,
              native: null,
            },
          },
        },
      })
    );

    const result = await searchTitle("something");
    expect(result).not.toBeNull();
    expect(result!.anilistId).toBe(99);
    expect(result!.english).toBeUndefined();
    expect(result!.romaji).toBeUndefined();
    expect(result!.native).toBeUndefined();
  });
});
