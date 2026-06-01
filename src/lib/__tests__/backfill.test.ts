import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MetadataSource, MetadataResult } from "../metadata/types";

vi.mock("../profile", () => ({
  requireProfileId: vi.fn().mockResolvedValue("test-profile-id"),
  getActiveProfileId: vi.fn().mockResolvedValue("test-profile-id"),
}));

vi.mock("../db", () => {
  const libraryEntries: Array<{
    id: string;
    title: string;
    anilistId: number | null;
    titleEnglish: string | null;
    titleRomaji: string | null;
    titleNative: string | null;
  }> = [];

  return {
    prisma: {
      libraryEntry: {
        findMany: vi.fn(({ where }: { where?: { anilistId: null } }) => {
          if (where?.anilistId === null) {
            return Promise.resolve(libraryEntries.filter((e) => e.anilistId === null));
          }
          return Promise.resolve(libraryEntries);
        }),
        update: vi.fn(
          ({
            where,
            data,
          }: {
            where: { id: string };
            data: Partial<(typeof libraryEntries)[0]>;
          }) => {
            const entry = libraryEntries.find((e) => e.id === where.id);
            if (entry) Object.assign(entry, data);
            return Promise.resolve(entry ?? null);
          },
        ),
        _entries: libraryEntries,
      },
    },
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "../db";
import { backfillTitles } from "../library";

function seedEntries(
  entries: Array<{ id: string; title: string; anilistId?: number | null }>,
) {
  const arr = (prisma.libraryEntry as unknown as { _entries: unknown[] })._entries;
  arr.length = 0;
  for (const e of entries) {
    arr.push({
      id: e.id,
      title: e.title,
      anilistId: e.anilistId ?? null,
      titleEnglish: null,
      titleRomaji: null,
      titleNative: null,
    });
  }
}

function makeSource(
  result: MetadataResult | null | "throw",
): MetadataSource {
  return {
    searchTitle: vi.fn(async () => {
      if (result === "throw") throw new Error("AniList unavailable");
      return result;
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  const arr = (prisma.libraryEntry as unknown as { _entries: unknown[] })._entries;
  arr.length = 0;
});

describe("backfillTitles", () => {
  it("returns zero counts when no entries need backfill", async () => {
    seedEntries([{ id: "a", title: "Already resolved", anilistId: 1234 }]);
    const source = makeSource({ anilistId: 99, english: "Something" });
    const result = await backfillTitles(source);
    expect(result).toEqual({ processed: 0, resolved: 0, skipped: 0 });
    expect(source.searchTitle).not.toHaveBeenCalled();
  });

  it("resolves an entry that has no anilistId", async () => {
    seedEntries([{ id: "b", title: "Solo Leveling" }]);
    const meta: MetadataResult = {
      anilistId: 85670,
      english: "Solo Leveling",
      romaji: "Ore dake Level Up na Ken",
      native: "나 혼자만 레벨업",
    };
    const source = makeSource(meta);
    const result = await backfillTitles(source);
    expect(result).toEqual({ processed: 1, resolved: 1, skipped: 0 });
    expect(prisma.libraryEntry.update).toHaveBeenCalledWith({
      where: { id: "b" },
      data: {
        anilistId: 85670,
        titleEnglish: "Solo Leveling",
        titleRomaji: "Ore dake Level Up na Ken",
        titleNative: "나 혼자만 레벨업",
      },
    });
  });

  it("skips (does not abort) when AniList returns null for an entry", async () => {
    seedEntries([
      { id: "c", title: "Unknown Series" },
      { id: "d", title: "Another Series" },
    ]);
    const source: MetadataSource = {
      searchTitle: vi.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ anilistId: 42, english: "Another Series" }),
    };
    const result = await backfillTitles(source);
    expect(result).toEqual({ processed: 2, resolved: 1, skipped: 1 });
  });

  it("skips (does not abort) when AniList throws on one entry", async () => {
    seedEntries([
      { id: "e", title: "Failing Series" },
      { id: "f", title: "OK Series" },
    ]);
    const source: MetadataSource = {
      searchTitle: vi.fn()
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ anilistId: 7, english: "OK Series" }),
    };
    const result = await backfillTitles(source);
    expect(result).toEqual({ processed: 2, resolved: 1, skipped: 1 });
    // Ensure the second entry was still attempted.
    expect(source.searchTitle).toHaveBeenCalledTimes(2);
  });

  it("is idempotent: already-resolved entries are not touched", async () => {
    seedEntries([
      { id: "g", title: "Resolved", anilistId: 100 },
      { id: "h", title: "Pending" },
    ]);
    const meta: MetadataResult = { anilistId: 200, english: "Pending Title" };
    const source = makeSource(meta);
    const result = await backfillTitles(source);
    expect(result.processed).toBe(1); // Only the pending entry.
    expect(source.searchTitle).toHaveBeenCalledTimes(1);
    expect(source.searchTitle).toHaveBeenCalledWith("Pending");
  });

  it("handles null result from source for all titles (partial metadata)", async () => {
    seedEntries([{ id: "i", title: "No Titles Series" }]);
    const meta: MetadataResult = {
      anilistId: 999,
      english: undefined,
      romaji: undefined,
      native: undefined,
    };
    const source = makeSource(meta);
    const result = await backfillTitles(source);
    expect(result).toEqual({ processed: 1, resolved: 1, skipped: 0 });
    expect(prisma.libraryEntry.update).toHaveBeenCalledWith({
      where: { id: "i" },
      data: {
        anilistId: 999,
        titleEnglish: null,
        titleRomaji: null,
        titleNative: null,
      },
    });
  });
});
