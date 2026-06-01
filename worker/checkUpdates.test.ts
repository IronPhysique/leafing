import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import type { SourceSeriesDetail } from "../lib/sources/types";

vi.mock("../lib/sources", () => ({
  getSource: vi.fn(),
}));

import { getSource } from "../lib/sources";
import { prisma } from "../lib/db";
import { checkUpdates } from "./checkUpdates";

const mockGetSource = getSource as ReturnType<typeof vi.fn>;

// Helper: build a fake SourceSeriesDetail with the given chapters.
function makeDetail(
  chapters: Array<{ ref: string; number: string }>,
): SourceSeriesDetail {
  return {
    slug: "test-slug",
    title: "Test Series",
    chapters: chapters.map((c) => ({
      ref: c.ref,
      number: c.number,
      language: "en",
    })),
  };
}

const PROFILE_A = "test_worker_profile_a";
const PROFILE_B = "test_worker_profile_b";
const SOURCE_ID = "test-worker-source";
const SLUG = "test-worker-slug";

beforeAll(async () => {
  for (const id of [PROFILE_A, PROFILE_B]) {
    await prisma.profile.upsert({
      where: { id },
      create: { id, name: `Worker Test ${id}` },
      update: {},
    });
  }
});

afterAll(async () => {
  for (const id of [PROFILE_A, PROFILE_B]) {
    await prisma.profile.deleteMany({ where: { id } });
  }
  await prisma.$disconnect();
});

beforeEach(async () => {
  vi.clearAllMocks();
  await prisma.libraryEntry.deleteMany({ where: { profileId: { in: [PROFILE_A, PROFILE_B] } } });
  await prisma.knownChapter.deleteMany({ where: { sourceId: SOURCE_ID, slug: SLUG } });
});

async function followAs(profileId: string, extra: Record<string, unknown> = {}) {
  return prisma.libraryEntry.create({
    data: {
      profileId,
      sourceId: SOURCE_ID,
      slug: SLUG,
      title: "Test Series",
      unreadCount: 0,
      ...extra,
    },
  });
}

async function getEntry(profileId: string) {
  return prisma.libraryEntry.findUnique({
    where: {
      profileId_sourceId_slug: { profileId, sourceId: SOURCE_ID, slug: SLUG },
    },
  });
}

describe("checkUpdates — first check (baseline)", () => {
  it("inserts all chapters into KnownChapter and leaves unreadCount = 0", async () => {
    await followAs(PROFILE_A);

    mockGetSource.mockReturnValue({
      getSeries: vi.fn().mockResolvedValue(
        makeDetail([
          { ref: "c1", number: "1" },
          { ref: "c2", number: "2" },
          { ref: "c3", number: "3" },
        ]),
      ),
    });

    await checkUpdates({ sourceId: SOURCE_ID, slug: SLUG });

    const known = await prisma.knownChapter.findMany({ where: { sourceId: SOURCE_ID, slug: SLUG } });
    expect(known).toHaveLength(3);
    expect(known.map((k) => k.chapterRef).sort()).toEqual(["c1", "c2", "c3"]);

    const entry = await getEntry(PROFILE_A);
    expect(entry?.unreadCount).toBe(0);
  });

  it("stamps lastCheckedAt even on the first (baseline) check", async () => {
    await followAs(PROFILE_A);
    const before = new Date();

    mockGetSource.mockReturnValue({
      getSeries: vi.fn().mockResolvedValue(makeDetail([{ ref: "c1", number: "1" }])),
    });

    await checkUpdates({ sourceId: SOURCE_ID, slug: SLUG });

    const entry = await getEntry(PROFILE_A);
    expect(entry?.lastCheckedAt).not.toBeNull();
    expect(entry!.lastCheckedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});

describe("checkUpdates — subsequent check with new chapters", () => {
  it("increments unreadCount for every profile following the series", async () => {
    await followAs(PROFILE_A);
    await followAs(PROFILE_B);

    mockGetSource.mockReturnValue({
      getSeries: vi.fn().mockResolvedValue(
        makeDetail([
          { ref: "c1", number: "1" },
          { ref: "c2", number: "2" },
        ]),
      ),
    });
    await checkUpdates({ sourceId: SOURCE_ID, slug: SLUG });

    mockGetSource.mockReturnValue({
      getSeries: vi.fn().mockResolvedValue(
        makeDetail([
          { ref: "c1", number: "1" },
          { ref: "c2", number: "2" },
          { ref: "c3", number: "3" },
        ]),
      ),
    });
    await checkUpdates({ sourceId: SOURCE_ID, slug: SLUG });

    const entryA = await getEntry(PROFILE_A);
    const entryB = await getEntry(PROFILE_B);

    expect(entryA?.unreadCount).toBe(1);
    expect(entryB?.unreadCount).toBe(1);
  });

  it("increments by the correct count when multiple new chapters arrive", async () => {
    await followAs(PROFILE_A);

    mockGetSource.mockReturnValue({
      getSeries: vi.fn().mockResolvedValue(makeDetail([{ ref: "c1", number: "1" }])),
    });
    await checkUpdates({ sourceId: SOURCE_ID, slug: SLUG });

    mockGetSource.mockReturnValue({
      getSeries: vi.fn().mockResolvedValue(
        makeDetail([
          { ref: "c1", number: "1" },
          { ref: "c2", number: "2" },
          { ref: "c3", number: "3" },
          { ref: "c4", number: "4" },
        ]),
      ),
    });
    await checkUpdates({ sourceId: SOURCE_ID, slug: SLUG });

    const entry = await getEntry(PROFILE_A);
    expect(entry?.unreadCount).toBe(3);
  });

  it("keeps KnownChapter global — not duplicated per profile", async () => {
    await followAs(PROFILE_A);
    await followAs(PROFILE_B);

    mockGetSource.mockReturnValue({
      getSeries: vi.fn().mockResolvedValue(
        makeDetail([
          { ref: "c1", number: "1" },
          { ref: "c2", number: "2" },
        ]),
      ),
    });
    await checkUpdates({ sourceId: SOURCE_ID, slug: SLUG });

    const known = await prisma.knownChapter.findMany({ where: { sourceId: SOURCE_ID, slug: SLUG } });
    expect(known).toHaveLength(2);
  });
});

describe("checkUpdates — idempotency", () => {
  it("running the same check twice does NOT double-increment unreadCount", async () => {
    await followAs(PROFILE_A);

    mockGetSource.mockReturnValue({
      getSeries: vi.fn().mockResolvedValue(makeDetail([{ ref: "c1", number: "1" }])),
    });
    await checkUpdates({ sourceId: SOURCE_ID, slug: SLUG });

    const secondDetail = makeDetail([
      { ref: "c1", number: "1" },
      { ref: "c2", number: "2" },
    ]);
    mockGetSource.mockReturnValue({ getSeries: vi.fn().mockResolvedValue(secondDetail) });
    await checkUpdates({ sourceId: SOURCE_ID, slug: SLUG });
    await checkUpdates({ sourceId: SOURCE_ID, slug: SLUG });

    const entry = await getEntry(PROFILE_A);
    expect(entry?.unreadCount).toBe(1);
  });
});

describe("checkUpdates — no chapters returned", () => {
  it("stamps lastCheckedAt and does not throw when source returns empty chapters", async () => {
    await followAs(PROFILE_A);
    const before = new Date();

    mockGetSource.mockReturnValue({
      getSeries: vi.fn().mockResolvedValue(makeDetail([])),
    });

    await expect(checkUpdates({ sourceId: SOURCE_ID, slug: SLUG })).resolves.toBeUndefined();

    const entry = await getEntry(PROFILE_A);
    expect(entry?.lastCheckedAt).not.toBeNull();
    expect(entry!.lastCheckedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());

    const known = await prisma.knownChapter.findMany({ where: { sourceId: SOURCE_ID, slug: SLUG } });
    expect(known).toHaveLength(0);
  });
});
