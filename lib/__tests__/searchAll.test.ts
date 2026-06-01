import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Source, SourceSeriesSummary } from "../sources/types";

function makeSource(
  id: string,
  results: SourceSeriesSummary[] | "throw" | "timeout",
): Source {
  return {
    id,
    name: id,
    language: "en",
    baseUrl: `https://${id}.example`,
    filters: { sorts: [], statuses: [], contentRatings: [] },
    async search() {
      if (results === "throw") throw new Error(`${id} blew up`);
      if (results === "timeout") {
        // Never resolves within the test window.
        return new Promise<SourceSeriesSummary[]>(() => {});
      }
      return results;
    },
    getSeries: vi.fn(),
    getChapter: vi.fn(),
  } as unknown as Source;
}

vi.mock("../sources/mangadex", () => ({ mangadex: { id: "mangadex", name: "MangaDex", language: "en", baseUrl: "", filters: { sorts: [], statuses: [], contentRatings: [] }, search: vi.fn().mockResolvedValue([]), getSeries: vi.fn(), getChapter: vi.fn() } }));
vi.mock("../sources/flamecomics", () => ({ flamecomics: { id: "flamecomics", name: "FlameComics", language: "en", baseUrl: "", filters: { sorts: [], statuses: [], contentRatings: [] }, search: vi.fn().mockResolvedValue([]), getSeries: vi.fn(), getChapter: vi.fn() } }));

import { SOURCES, searchAll, sourceBadge, getSource } from "../sources/index";
import type { Source as SourceType } from "../sources/types";

function withSources(map: Record<string, SourceType>, fn: () => Promise<void>): Promise<void> {
  const orig = { ...SOURCES };
  for (const k of Object.keys(SOURCES)) delete SOURCES[k];
  Object.assign(SOURCES, map);
  return fn().finally(() => {
    for (const k of Object.keys(SOURCES)) delete SOURCES[k];
    Object.assign(SOURCES, orig);
  });
}

describe("sourceBadge", () => {
  it("extracts CamelCase capitals from name", () => {
    const s = { id: "test", name: "MangaDex" } as Source;
    expect(sourceBadge(s)).toBe("MD");
  });

  it("falls back to id prefix when no capitals", () => {
    const s = { id: "sourceX", name: "myfeed" } as Source;
    expect(sourceBadge(s)).toBe("SO");
  });

  it("caps badge at 3 chars", () => {
    const s = { id: "x", name: "FlameComicsXYZ" } as Source;
    expect(sourceBadge(s)).toBe("FCX");
  });
});

describe("searchAll", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("aggregates results from all sources and tags each with sourceId", async () => {
    const a: SourceSeriesSummary = { slug: "a-slug", title: "Title A" };
    const b: SourceSeriesSummary = { slug: "b-slug", title: "Title B" };
    const src1 = makeSource("src1", [a]);
    const src2 = makeSource("src2", [b]);

    await withSources({ src1, src2 }, async () => {
      const promise = searchAll("test");
      await vi.runAllTimersAsync();
      const results = await promise;
      expect(results).toHaveLength(2);
      expect(results.find((r) => r.slug === "a-slug")?.sourceId).toBe("src1");
      expect(results.find((r) => r.slug === "b-slug")?.sourceId).toBe("src2");
    });
  });

  it("drops a source that throws and returns remaining results", async () => {
    const good: SourceSeriesSummary = { slug: "ok", title: "OK" };
    const src1 = makeSource("good", [good]);
    const src2 = makeSource("bad", "throw");

    await withSources({ good: src1, bad: src2 }, async () => {
      const promise = searchAll("test");
      await vi.runAllTimersAsync();
      const results = await promise;
      expect(results).toHaveLength(1);
      expect(results[0].sourceId).toBe("good");
    });
  });

  it("drops a source that times out and returns remaining results", async () => {
    const fast: SourceSeriesSummary = { slug: "fast", title: "Fast" };
    const src1 = makeSource("fast", [fast]);
    const src2 = makeSource("slow", "timeout");

    await withSources({ fast: src1, slow: src2 }, async () => {
      const promise = searchAll("test");
      await vi.advanceTimersByTimeAsync(9_000);
      const results = await promise;
      expect(results).toHaveLength(1);
      expect(results[0].sourceId).toBe("fast");
    });
  });

  it("returns empty array when all sources fail", async () => {
    const src1 = makeSource("bad1", "throw");
    const src2 = makeSource("bad2", "throw");

    await withSources({ bad1: src1, bad2: src2 }, async () => {
      const promise = searchAll("");
      await vi.runAllTimersAsync();
      const results = await promise;
      expect(results).toEqual([]);
    });
  });

  it("never throws even when all sources fail", async () => {
    const src1 = makeSource("err", "throw");

    await withSources({ err: src1 }, async () => {
      const promise = searchAll("anything");
      await vi.runAllTimersAsync();
      await expect(promise).resolves.toEqual([]);
    });
  });
});
