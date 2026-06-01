"use server";

import { prisma } from "./db";
import { revalidatePath } from "next/cache";
import type { MetadataSource } from "./metadata/types";
import { requireProfileId } from "./profile";

export async function isFollowed(sourceId: string, slug: string): Promise<boolean> {
  const profileId = await requireProfileId();
  const e = await prisma.libraryEntry.findUnique({
    where: { profileId_sourceId_slug: { profileId, sourceId, slug } },
  });
  return !!e;
}

export async function toggleFollow(
  input: {
    sourceId: string;
    slug: string;
    title: string;
    coverUrl?: string;
    coverReferer?: string;
  },
  metadataSource?: MetadataSource
): Promise<boolean> {
  const profileId = await requireProfileId();
  const { sourceId, slug } = input;
  const existing = await prisma.libraryEntry.findUnique({
    where: { profileId_sourceId_slug: { profileId, sourceId, slug } },
  });
  if (existing) {
    await prisma.libraryEntry.delete({ where: { id: existing.id } });
    revalidatePath("/library");
    revalidatePath(`/series/${sourceId}/${slug}`);
    return false;
  }

  let titleEnglish: string | undefined;
  let titleRomaji: string | undefined;
  let titleNative: string | undefined;
  let anilistId: number | undefined;

  try {
    const source: MetadataSource =
      metadataSource ?? (await import("./metadata/anilist")).default;

    const meta = await source.searchTitle(input.title);
    if (meta) {
      anilistId = meta.anilistId;
      titleEnglish = meta.english;
      titleRomaji = meta.romaji;
      titleNative = meta.native;
    }
  } catch {
  }

  await prisma.libraryEntry.create({
    data: {
      profileId,
      sourceId,
      slug,
      title: input.title,
      coverUrl: input.coverUrl,
      coverReferer: input.coverReferer,
      titleEnglish,
      titleRomaji,
      titleNative,
      anilistId,
    },
  });
  revalidatePath("/library");
  revalidatePath(`/series/${sourceId}/${slug}`);
  return true;
}

export async function setProgress(input: {
  sourceId: string;
  slug: string;
  chapterRef: string;
  chapterNumber?: string;
  page: number;
  scrollOffset?: number;
  finished?: boolean;
  isLatestChapter?: boolean;
}): Promise<void> {
  const profileId = await requireProfileId();
  const { sourceId, slug, chapterRef } = input;
  const scrollOffset = input.scrollOffset ?? 0;
  await prisma.readProgress.upsert({
    where: { profileId_sourceId_slug_chapterRef: { profileId, sourceId, slug, chapterRef } },
    create: {
      profileId,
      sourceId,
      slug,
      chapterRef,
      chapterNumber: input.chapterNumber,
      page: input.page,
      scrollOffset,
      finished: input.finished ?? false,
    },
    update: {
      page: input.page,
      scrollOffset,
      finished: input.finished ?? false,
      chapterNumber: input.chapterNumber,
    },
  });

  await prisma.libraryEntry.updateMany({
    where: { profileId, sourceId, slug },
    data: {
      lastReadAt: new Date(),
      ...(input.isLatestChapter ? { unreadCount: 0 } : {}),
    },
  });
}

export async function clearUnread(sourceId: string, slug: string): Promise<void> {
  const profileId = await requireProfileId();
  await prisma.libraryEntry.updateMany({
    where: { profileId, sourceId, slug },
    data: { unreadCount: 0 },
  });
  revalidatePath("/library");
  revalidatePath(`/series/${sourceId}/${slug}`);
}

export interface BackfillResult {
  processed: number;
  resolved: number;
  skipped: number;
}

export async function getCategories() {
  const profileId = await requireProfileId();
  return prisma.category.findMany({
    where: { profileId },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
}

export async function createCategory(name: string): Promise<void> {
  const profileId = await requireProfileId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required.");
  const maxOrder = await prisma.category.aggregate({
    where: { profileId },
    _max: { order: true },
  });
  await prisma.category.create({
    data: { profileId, name: trimmed, order: (maxOrder._max.order ?? -1) + 1 },
  });
  revalidatePath("/library");
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const profileId = await requireProfileId();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required.");
  await prisma.category.update({ where: { id, profileId }, data: { name: trimmed } });
  revalidatePath("/library");
}

export async function deleteCategory(id: string): Promise<void> {
  const profileId = await requireProfileId();
  await prisma.category.delete({ where: { id, profileId } });
  revalidatePath("/library");
}

export async function setEntryCategories(
  sourceId: string,
  slug: string,
  categoryIds: string[]
): Promise<void> {
  const profileId = await requireProfileId();
  const entry = await prisma.libraryEntry.findUnique({
    where: { profileId_sourceId_slug: { profileId, sourceId, slug } },
    select: { id: true },
  });
  if (!entry) return;

  await prisma.$transaction([
    prisma.libraryEntryCategory.deleteMany({ where: { libraryEntryId: entry.id } }),
    ...(categoryIds.length
      ? [
          prisma.libraryEntryCategory.createMany({
            data: categoryIds.map((categoryId) => ({
              libraryEntryId: entry.id,
              categoryId,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);
  revalidatePath("/library");
  revalidatePath(`/series/${sourceId}/${slug}`);
}

export async function backfillTitles(
  metadataSource?: MetadataSource,
  overrideProfileId?: string
): Promise<BackfillResult> {
  const profileId = overrideProfileId ?? (await requireProfileId());
  const entries = await prisma.libraryEntry.findMany({
    where: { profileId, anilistId: null },
    select: { id: true, title: true },
  });

  const source: MetadataSource =
    metadataSource ?? (await import("./metadata/anilist")).default;

  let resolved = 0;
  let skipped = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    if (i > 0) {
      await new Promise((r) => setTimeout(r, 700));
    }

    try {
      const meta = await source.searchTitle(entry.title);
      if (meta) {
        await prisma.libraryEntry.update({
          where: { id: entry.id },
          data: {
            anilistId: meta.anilistId,
            titleEnglish: meta.english ?? null,
            titleRomaji: meta.romaji ?? null,
            titleNative: meta.native ?? null,
          },
        });
        resolved++;
      } else {
        skipped++;
      }
    } catch {
      skipped++;
    }
  }

  revalidatePath("/library");
  revalidatePath("/");

  return { processed: entries.length, resolved, skipped };
}
