import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

const TEST_PROFILE_ID = "test_queries";

vi.mock("../profile", () => ({
  requireProfileId: vi.fn().mockResolvedValue("test_queries"),
  getActiveProfileId: vi.fn().mockResolvedValue("test_queries"),
}));

import { prisma } from "../db";
import { getUnreadEntries, getCurrentlyReadingEntries } from "../queries";

beforeAll(async () => {
  await prisma.profile.upsert({
    where: { id: TEST_PROFILE_ID },
    create: { id: TEST_PROFILE_ID, name: "Test Queries Profile" },
    update: {},
  });
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { id: TEST_PROFILE_ID } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.readProgress.deleteMany({ where: { profileId: TEST_PROFILE_ID } });
  await prisma.libraryEntry.deleteMany({ where: { profileId: TEST_PROFILE_ID } });
  await prisma.knownChapter.deleteMany({ where: { sourceId: "test-source" } });
});

describe("getUnreadEntries", () => {
  it("returns empty array when no entries have unread > 0", async () => {
    await prisma.libraryEntry.create({
      data: {
        profileId: TEST_PROFILE_ID,
        sourceId: "test-source",
        slug: "read-series",
        title: "Read Series",
        unreadCount: 0,
      },
    });

    const result = await getUnreadEntries();
    expect(result).toHaveLength(0);
  });

  it("returns only entries with unreadCount > 0", async () => {
    await prisma.libraryEntry.createMany({
      data: [
        {
          profileId: TEST_PROFILE_ID,
          sourceId: "test-source",
          slug: "unread-a",
          title: "Unread A",
          unreadCount: 2,
        },
        {
          profileId: TEST_PROFILE_ID,
          sourceId: "test-source",
          slug: "all-read",
          title: "All Read",
          unreadCount: 0,
        },
        {
          profileId: TEST_PROFILE_ID,
          sourceId: "test-source",
          slug: "unread-b",
          title: "Unread B",
          unreadCount: 5,
        },
      ],
    });

    const result = await getUnreadEntries();
    expect(result).toHaveLength(2);
    const slugs = result.map((e) => e.slug).sort();
    expect(slugs).toEqual(["unread-a", "unread-b"]);
  });

  it("attaches latestRef from KnownChapter when available", async () => {
    await prisma.libraryEntry.create({
      data: {
        profileId: TEST_PROFILE_ID,
        sourceId: "test-source",
        slug: "known-series",
        title: "Known Series",
        unreadCount: 1,
      },
    });
    await prisma.knownChapter.createMany({
      data: [
        { sourceId: "test-source", slug: "known-series", chapterRef: "ch-1", number: "1" },
        { sourceId: "test-source", slug: "known-series", chapterRef: "ch-3", number: "3" },
        { sourceId: "test-source", slug: "known-series", chapterRef: "ch-2", number: "2" },
      ],
    });

    const result = await getUnreadEntries();
    expect(result).toHaveLength(1);
    expect(result[0].latestRef).toBe("ch-3");
  });

  it("picks latestRef by highest parseFloat(number), NOT insertion order", async () => {
    await prisma.libraryEntry.create({
      data: {
        profileId: TEST_PROFILE_ID,
        sourceId: "test-source",
        slug: "order-test",
        title: "Order Test",
        unreadCount: 3,
      },
    });
    await prisma.knownChapter.createMany({
      data: [
        { sourceId: "test-source", slug: "order-test", chapterRef: "ch-10", number: "10" },
        { sourceId: "test-source", slug: "order-test", chapterRef: "ch-5", number: "5" },
        { sourceId: "test-source", slug: "order-test", chapterRef: "ch-100", number: "100" },
      ],
    });

    const result = await getUnreadEntries();
    expect(result).toHaveLength(1);
    expect(result[0].latestRef).toBe("ch-100");
  });

  it("handles decimal chapter numbers correctly (e.g. 12.5 > 12)", async () => {
    await prisma.libraryEntry.create({
      data: {
        profileId: TEST_PROFILE_ID,
        sourceId: "test-source",
        slug: "decimal-test",
        title: "Decimal Test",
        unreadCount: 1,
      },
    });
    await prisma.knownChapter.createMany({
      data: [
        { sourceId: "test-source", slug: "decimal-test", chapterRef: "ch-12", number: "12" },
        { sourceId: "test-source", slug: "decimal-test", chapterRef: "ch-12.5", number: "12.5" },
        { sourceId: "test-source", slug: "decimal-test", chapterRef: "ch-11", number: "11" },
      ],
    });

    const result = await getUnreadEntries();
    expect(result[0].latestRef).toBe("ch-12.5");
  });

  it("sets latestRef to null when there are no KnownChapter rows", async () => {
    await prisma.libraryEntry.create({
      data: {
        profileId: TEST_PROFILE_ID,
        sourceId: "test-source",
        slug: "no-known",
        title: "No Known",
        unreadCount: 1,
      },
    });

    const result = await getUnreadEntries();
    expect(result).toHaveLength(1);
    expect(result[0].latestRef).toBeNull();
  });

  it("is scoped to the active profile — other profiles are excluded", async () => {
    const OTHER = "test_queries_other";
    await prisma.profile.upsert({
      where: { id: OTHER },
      create: { id: OTHER, name: "Other Queries" },
      update: {},
    });

    await prisma.libraryEntry.create({
      data: {
        profileId: OTHER,
        sourceId: "test-source",
        slug: "other-unread",
        title: "Other Unread",
        unreadCount: 99,
      },
    });

    const result = await getUnreadEntries();
    expect(result).toHaveLength(0);

    await prisma.profile.delete({ where: { id: OTHER } });
  });
});

describe("getCurrentlyReadingEntries", () => {
  it("returns empty array when no in-progress rows exist", async () => {
    const result = await getCurrentlyReadingEntries();
    expect(result).toHaveLength(0);
  });

  it("returns entries that have at least one unfinished ReadProgress row", async () => {
    await prisma.libraryEntry.createMany({
      data: [
        {
          profileId: TEST_PROFILE_ID,
          sourceId: "test-source",
          slug: "in-prog",
          title: "In Progress",
        },
        {
          profileId: TEST_PROFILE_ID,
          sourceId: "test-source",
          slug: "finished",
          title: "Finished",
        },
      ],
    });
    await prisma.readProgress.createMany({
      data: [
        {
          profileId: TEST_PROFILE_ID,
          sourceId: "test-source",
          slug: "in-prog",
          chapterRef: "c1",
          finished: false,
          page: 5,
        },
        {
          profileId: TEST_PROFILE_ID,
          sourceId: "test-source",
          slug: "finished",
          chapterRef: "c1",
          finished: true,
          page: 20,
        },
      ],
    });

    const result = await getCurrentlyReadingEntries();
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("in-prog");
  });

  it("deduplicates by series — multiple chapters in one series yields one entry", async () => {
    await prisma.libraryEntry.create({
      data: {
        profileId: TEST_PROFILE_ID,
        sourceId: "test-source",
        slug: "multi-chap",
        title: "Multi Chapter",
      },
    });
    await prisma.readProgress.createMany({
      data: [
        {
          profileId: TEST_PROFILE_ID,
          sourceId: "test-source",
          slug: "multi-chap",
          chapterRef: "c1",
          finished: false,
          page: 2,
        },
        {
          profileId: TEST_PROFILE_ID,
          sourceId: "test-source",
          slug: "multi-chap",
          chapterRef: "c2",
          finished: false,
          page: 4,
        },
      ],
    });

    const result = await getCurrentlyReadingEntries();
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("multi-chap");
  });

  it("orders by most-recently-updated ReadProgress first", async () => {
    const now = Date.now();

    await prisma.libraryEntry.createMany({
      data: [
        {
          profileId: TEST_PROFILE_ID,
          sourceId: "test-source",
          slug: "older-series",
          title: "Older",
        },
        {
          profileId: TEST_PROFILE_ID,
          sourceId: "test-source",
          slug: "newer-series",
          title: "Newer",
        },
      ],
    });

    await prisma.readProgress.create({
      data: {
        profileId: TEST_PROFILE_ID,
        sourceId: "test-source",
        slug: "older-series",
        chapterRef: "c1",
        finished: false,
        page: 1,
        updatedAt: new Date(now - 10_000),
      },
    });
    await prisma.readProgress.create({
      data: {
        profileId: TEST_PROFILE_ID,
        sourceId: "test-source",
        slug: "newer-series",
        chapterRef: "c1",
        finished: false,
        page: 1,
        updatedAt: new Date(now),
      },
    });

    const result = await getCurrentlyReadingEntries();
    expect(result).toHaveLength(2);
    expect(result[0].slug).toBe("newer-series");
    expect(result[1].slug).toBe("older-series");
  });

  it("excludes series that only have finished chapters", async () => {
    await prisma.libraryEntry.create({
      data: {
        profileId: TEST_PROFILE_ID,
        sourceId: "test-source",
        slug: "all-done",
        title: "All Done",
      },
    });
    await prisma.readProgress.createMany({
      data: [
        {
          profileId: TEST_PROFILE_ID,
          sourceId: "test-source",
          slug: "all-done",
          chapterRef: "c1",
          finished: true,
          page: 10,
        },
        {
          profileId: TEST_PROFILE_ID,
          sourceId: "test-source",
          slug: "all-done",
          chapterRef: "c2",
          finished: true,
          page: 10,
        },
      ],
    });

    const result = await getCurrentlyReadingEntries();
    expect(result).toHaveLength(0);
  });

  it("is scoped to the active profile", async () => {
    const OTHER = "test_queries_reading_other";
    await prisma.profile.upsert({
      where: { id: OTHER },
      create: { id: OTHER, name: "Other Reading" },
      update: {},
    });

    await prisma.libraryEntry.create({
      data: { profileId: OTHER, sourceId: "test-source", slug: "other-prog", title: "Other" },
    });
    await prisma.readProgress.create({
      data: {
        profileId: OTHER,
        sourceId: "test-source",
        slug: "other-prog",
        chapterRef: "c1",
        finished: false,
        page: 1,
      },
    });

    const result = await getCurrentlyReadingEntries();
    expect(result).toHaveLength(0);

    await prisma.profile.delete({ where: { id: OTHER } });
  });
});
