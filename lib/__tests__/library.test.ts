import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";

const TEST_PROFILE_ID = "test_library_actions";

vi.mock("../profile", () => ({
  requireProfileId: vi.fn().mockResolvedValue("test_library_actions"),
  getActiveProfileId: vi.fn().mockResolvedValue("test_library_actions"),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { prisma } from "../db";
import {
  toggleFollow,
  setProgress,
  clearUnread,
  createCategory,
  renameCategory,
  deleteCategory,
  setEntryCategories,
} from "../library";
import type { MetadataSource } from "../metadata/types";

const noopMeta: MetadataSource = {
  searchTitle: vi.fn().mockResolvedValue(null),
};

beforeAll(async () => {
  await prisma.profile.upsert({
    where: { id: TEST_PROFILE_ID },
    create: { id: TEST_PROFILE_ID, name: "Test Library Actions" },
    update: {},
  });
});

afterAll(async () => {
  await prisma.profile.deleteMany({ where: { id: TEST_PROFILE_ID } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.libraryEntryCategory.deleteMany({
    where: { libraryEntry: { profileId: TEST_PROFILE_ID } },
  });
  await prisma.readProgress.deleteMany({ where: { profileId: TEST_PROFILE_ID } });
  await prisma.libraryEntry.deleteMany({ where: { profileId: TEST_PROFILE_ID } });
  await prisma.category.deleteMany({ where: { profileId: TEST_PROFILE_ID } });
});

describe("toggleFollow", () => {
  it("creates a LibraryEntry and returns true on first call", async () => {
    const result = await toggleFollow(
      { sourceId: "mangadex", slug: "solo-leveling", title: "Solo Leveling" },
      noopMeta,
    );
    expect(result).toBe(true);

    const entry = await prisma.libraryEntry.findUnique({
      where: {
        profileId_sourceId_slug: {
          profileId: TEST_PROFILE_ID,
          sourceId: "mangadex",
          slug: "solo-leveling",
        },
      },
    });
    expect(entry).not.toBeNull();
    expect(entry?.title).toBe("Solo Leveling");
    expect(entry?.profileId).toBe(TEST_PROFILE_ID);
  });

  it("removes the LibraryEntry and returns false on second call (toggle off)", async () => {
    await toggleFollow(
      { sourceId: "mangadex", slug: "omniscient-reader", title: "Omniscient Reader" },
      noopMeta,
    );
    const result = await toggleFollow(
      { sourceId: "mangadex", slug: "omniscient-reader", title: "Omniscient Reader" },
      noopMeta,
    );
    expect(result).toBe(false);

    const entry = await prisma.libraryEntry.findUnique({
      where: {
        profileId_sourceId_slug: {
          profileId: TEST_PROFILE_ID,
          sourceId: "mangadex",
          slug: "omniscient-reader",
        },
      },
    });
    expect(entry).toBeNull();
  });

  it("is scoped to the profile — another profile's follow is unaffected", async () => {
    const OTHER_PROFILE = "test_library_other";
    await prisma.profile.upsert({
      where: { id: OTHER_PROFILE },
      create: { id: OTHER_PROFILE, name: "Other Profile" },
      update: {},
    });

    await prisma.libraryEntry.create({
      data: {
        profileId: OTHER_PROFILE,
        sourceId: "mangadex",
        slug: "shared-slug",
        title: "Shared Series",
      },
    });

    const result = await toggleFollow(
      { sourceId: "mangadex", slug: "shared-slug", title: "Shared Series" },
      noopMeta,
    );
    expect(result).toBe(true);

    await toggleFollow(
      { sourceId: "mangadex", slug: "shared-slug", title: "Shared Series" },
      noopMeta,
    );

    const otherEntry = await prisma.libraryEntry.findUnique({
      where: {
        profileId_sourceId_slug: {
          profileId: OTHER_PROFILE,
          sourceId: "mangadex",
          slug: "shared-slug",
        },
      },
    });
    expect(otherEntry).not.toBeNull();

    await prisma.profile.delete({ where: { id: OTHER_PROFILE } });
  });

  it("enriches the entry with AniList metadata when source returns data", async () => {
    const metaSource: MetadataSource = {
      searchTitle: vi.fn().mockResolvedValue({
        anilistId: 42,
        english: "English Title",
        romaji: "Romaji Title",
        native: "Native Title",
      }),
    };

    await toggleFollow(
      { sourceId: "mangadex", slug: "enriched-series", title: "Enriched" },
      metaSource,
    );

    const entry = await prisma.libraryEntry.findUnique({
      where: {
        profileId_sourceId_slug: {
          profileId: TEST_PROFILE_ID,
          sourceId: "mangadex",
          slug: "enriched-series",
        },
      },
    });
    expect(entry?.anilistId).toBe(42);
    expect(entry?.titleEnglish).toBe("English Title");
    expect(entry?.titleRomaji).toBe("Romaji Title");
    expect(entry?.titleNative).toBe("Native Title");
  });
});

describe("setProgress", () => {
  beforeEach(async () => {
    await prisma.libraryEntry.create({
      data: {
        profileId: TEST_PROFILE_ID,
        sourceId: "mangadex",
        slug: "progress-test",
        title: "Progress Test",
        unreadCount: 3,
      },
    });
  });

  it("creates a ReadProgress row on first call", async () => {
    await setProgress({
      sourceId: "mangadex",
      slug: "progress-test",
      chapterRef: "ch-001",
      chapterNumber: "1",
      page: 5,
      scrollOffset: 120,
      finished: false,
    });

    const row = await prisma.readProgress.findUnique({
      where: {
        profileId_sourceId_slug_chapterRef: {
          profileId: TEST_PROFILE_ID,
          sourceId: "mangadex",
          slug: "progress-test",
          chapterRef: "ch-001",
        },
      },
    });
    expect(row).not.toBeNull();
    expect(row?.page).toBe(5);
    expect(row?.scrollOffset).toBe(120);
    expect(row?.finished).toBe(false);
    expect(row?.chapterNumber).toBe("1");
  });

  it("upserts — second call updates page/scrollOffset/finished", async () => {
    await setProgress({
      sourceId: "mangadex",
      slug: "progress-test",
      chapterRef: "ch-002",
      page: 2,
      scrollOffset: 40,
    });
    await setProgress({
      sourceId: "mangadex",
      slug: "progress-test",
      chapterRef: "ch-002",
      page: 10,
      scrollOffset: 800,
      finished: true,
    });

    const row = await prisma.readProgress.findUnique({
      where: {
        profileId_sourceId_slug_chapterRef: {
          profileId: TEST_PROFILE_ID,
          sourceId: "mangadex",
          slug: "progress-test",
          chapterRef: "ch-002",
        },
      },
    });
    expect(row?.page).toBe(10);
    expect(row?.scrollOffset).toBe(800);
    expect(row?.finished).toBe(true);

    const count = await prisma.readProgress.count({
      where: { profileId: TEST_PROFILE_ID, chapterRef: "ch-002" },
    });
    expect(count).toBe(1);
  });


  it("clears unreadCount when isLatestChapter=true", async () => {
    await setProgress({
      sourceId: "mangadex",
      slug: "progress-test",
      chapterRef: "ch-latest",
      page: 1,
      isLatestChapter: true,
    });

    const entry = await prisma.libraryEntry.findUnique({
      where: {
        profileId_sourceId_slug: {
          profileId: TEST_PROFILE_ID,
          sourceId: "mangadex",
          slug: "progress-test",
        },
      },
    });
    expect(entry?.unreadCount).toBe(0);
  });

  it("does NOT clear unreadCount when isLatestChapter is absent/false", async () => {
    await setProgress({
      sourceId: "mangadex",
      slug: "progress-test",
      chapterRef: "ch-midway",
      page: 3,
      isLatestChapter: false,
    });

    const entry = await prisma.libraryEntry.findUnique({
      where: {
        profileId_sourceId_slug: {
          profileId: TEST_PROFILE_ID,
          sourceId: "mangadex",
          slug: "progress-test",
        },
      },
    });
    expect(entry?.unreadCount).toBe(3);
  });

  it("updates lastReadAt on the library entry", async () => {
    const before = new Date();
    await setProgress({
      sourceId: "mangadex",
      slug: "progress-test",
      chapterRef: "ch-003",
      page: 1,
    });

    const entry = await prisma.libraryEntry.findUnique({
      where: {
        profileId_sourceId_slug: {
          profileId: TEST_PROFILE_ID,
          sourceId: "mangadex",
          slug: "progress-test",
        },
      },
    });
    expect(entry?.lastReadAt).not.toBeNull();
    expect(entry!.lastReadAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});

describe("clearUnread", () => {
  it("sets unreadCount to 0 for the calling profile only", async () => {
    const OTHER = "test_library_clearunread_other";
    await prisma.profile.upsert({
      where: { id: OTHER },
      create: { id: OTHER, name: "Other ClearUnread" },
      update: {},
    });

    await prisma.libraryEntry.create({
      data: {
        profileId: TEST_PROFILE_ID,
        sourceId: "mangadex",
        slug: "unread-series",
        title: "Unread Series",
        unreadCount: 5,
      },
    });
    await prisma.libraryEntry.create({
      data: {
        profileId: OTHER,
        sourceId: "mangadex",
        slug: "unread-series",
        title: "Unread Series",
        unreadCount: 7,
      },
    });

    await clearUnread("mangadex", "unread-series");

    const mine = await prisma.libraryEntry.findUnique({
      where: {
        profileId_sourceId_slug: {
          profileId: TEST_PROFILE_ID,
          sourceId: "mangadex",
          slug: "unread-series",
        },
      },
    });
    const theirs = await prisma.libraryEntry.findUnique({
      where: {
        profileId_sourceId_slug: {
          profileId: OTHER,
          sourceId: "mangadex",
          slug: "unread-series",
        },
      },
    });

    expect(mine?.unreadCount).toBe(0);
    expect(theirs?.unreadCount).toBe(7);

    await prisma.profile.delete({ where: { id: OTHER } });
  });
});

describe("createCategory", () => {
  it("creates a category owned by the active profile", async () => {
    await createCategory("Action");
    const cats = await prisma.category.findMany({ where: { profileId: TEST_PROFILE_ID } });
    expect(cats).toHaveLength(1);
    expect(cats[0].name).toBe("Action");
    expect(cats[0].profileId).toBe(TEST_PROFILE_ID);
  });

  it("assigns auto-incrementing order values", async () => {
    await createCategory("First");
    await createCategory("Second");
    await createCategory("Third");

    const cats = await prisma.category.findMany({
      where: { profileId: TEST_PROFILE_ID },
      orderBy: { order: "asc" },
    });
    expect(cats.map((c) => c.name)).toEqual(["First", "Second", "Third"]);
    // Orders should be strictly increasing.
    expect(cats[0].order).toBeLessThan(cats[1].order);
    expect(cats[1].order).toBeLessThan(cats[2].order);
  });

  it("rejects an empty name", async () => {
    await expect(createCategory("   ")).rejects.toThrow("Category name is required");
  });

  it("enforces uniqueness per profile (same name = DB unique violation)", async () => {
    await createCategory("Unique");
    await expect(createCategory("Unique")).rejects.toThrow();
  });
});

describe("renameCategory", () => {
  it("renames a category owned by the active profile", async () => {
    await createCategory("OldName");
    const cat = await prisma.category.findFirstOrThrow({ where: { profileId: TEST_PROFILE_ID } });

    await renameCategory(cat.id, "NewName");

    const updated = await prisma.category.findUnique({ where: { id: cat.id } });
    expect(updated?.name).toBe("NewName");
  });

  it("rejects an empty name", async () => {
    await createCategory("ValidName");
    const cat = await prisma.category.findFirstOrThrow({ where: { profileId: TEST_PROFILE_ID } });
    await expect(renameCategory(cat.id, "")).rejects.toThrow("Category name is required");
  });
});

describe("deleteCategory", () => {
  it("deletes a category owned by the active profile", async () => {
    await createCategory("ToDelete");
    const cat = await prisma.category.findFirstOrThrow({ where: { profileId: TEST_PROFILE_ID } });

    await deleteCategory(cat.id);

    const gone = await prisma.category.findUnique({ where: { id: cat.id } });
    expect(gone).toBeNull();
  });

  it("cascades — LibraryEntryCategory join rows are removed", async () => {
    await prisma.libraryEntry.create({
      data: { profileId: TEST_PROFILE_ID, sourceId: "s", slug: "cat-cascade", title: "T" },
    });
    await createCategory("CascadeCat");
    const cat = await prisma.category.findFirstOrThrow({ where: { profileId: TEST_PROFILE_ID } });
    const entry = await prisma.libraryEntry.findFirstOrThrow({
      where: { profileId: TEST_PROFILE_ID },
    });

    await prisma.libraryEntryCategory.create({
      data: { libraryEntryId: entry.id, categoryId: cat.id },
    });

    await deleteCategory(cat.id);

    const joins = await prisma.libraryEntryCategory.findMany({
      where: { categoryId: cat.id },
    });
    expect(joins).toHaveLength(0);
  });
});

describe("setEntryCategories", () => {
  it("assigns categories to a library entry", async () => {
    await prisma.libraryEntry.create({
      data: {
        profileId: TEST_PROFILE_ID,
        sourceId: "mangadex",
        slug: "cat-entry",
        title: "Category Entry",
      },
    });
    await createCategory("CatA");
    await createCategory("CatB");

    const cats = await prisma.category.findMany({ where: { profileId: TEST_PROFILE_ID } });
    const catIds = cats.map((c) => c.id);

    await setEntryCategories("mangadex", "cat-entry", catIds);

    const entry = await prisma.libraryEntry.findUniqueOrThrow({
      where: {
        profileId_sourceId_slug: {
          profileId: TEST_PROFILE_ID,
          sourceId: "mangadex",
          slug: "cat-entry",
        },
      },
      include: { categories: true },
    });
    expect(entry.categories).toHaveLength(2);
    expect(entry.categories.map((c) => c.categoryId).sort()).toEqual(catIds.sort());
  });

  it("replaces categories atomically on a second call", async () => {
    await prisma.libraryEntry.create({
      data: {
        profileId: TEST_PROFILE_ID,
        sourceId: "mangadex",
        slug: "cat-replace",
        title: "Replace Test",
      },
    });
    await createCategory("CatX");
    await createCategory("CatY");

    const [catX, catY] = await prisma.category.findMany({
      where: { profileId: TEST_PROFILE_ID },
      orderBy: { order: "asc" },
    });

    // Assign X.
    await setEntryCategories("mangadex", "cat-replace", [catX.id]);

    // Replace with Y only.
    await setEntryCategories("mangadex", "cat-replace", [catY.id]);

    const entry = await prisma.libraryEntry.findUniqueOrThrow({
      where: {
        profileId_sourceId_slug: {
          profileId: TEST_PROFILE_ID,
          sourceId: "mangadex",
          slug: "cat-replace",
        },
      },
      include: { categories: true },
    });
    expect(entry.categories).toHaveLength(1);
    expect(entry.categories[0].categoryId).toBe(catY.id);
  });

  it("clears all categories when passed an empty array", async () => {
    await prisma.libraryEntry.create({
      data: {
        profileId: TEST_PROFILE_ID,
        sourceId: "mangadex",
        slug: "cat-clear",
        title: "Clear Test",
      },
    });
    await createCategory("CatZ");
    const cat = await prisma.category.findFirstOrThrow({ where: { profileId: TEST_PROFILE_ID } });
    await setEntryCategories("mangadex", "cat-clear", [cat.id]);

    await setEntryCategories("mangadex", "cat-clear", []);

    const entry = await prisma.libraryEntry.findUniqueOrThrow({
      where: {
        profileId_sourceId_slug: {
          profileId: TEST_PROFILE_ID,
          sourceId: "mangadex",
          slug: "cat-clear",
        },
      },
      include: { categories: true },
    });
    expect(entry.categories).toHaveLength(0);
  });

  it("is a no-op when the entry does not exist", async () => {
    // Should not throw — just silently return.
    await expect(
      setEntryCategories("mangadex", "nonexistent-slug", ["fake-cat-id"]),
    ).resolves.toBeUndefined();
  });
});
