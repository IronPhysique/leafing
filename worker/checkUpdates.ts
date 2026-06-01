import { getSource } from "../lib/sources";
import { prisma } from "../lib/db";
import type { UpdateJobData } from "../lib/queue";
import type { SourceChapterSummary } from "../lib/sources/types";

export async function checkUpdates(data: UpdateJobData): Promise<void> {
  const { sourceId, slug } = data;

  const source = getSource(sourceId);
  const detail = await source.getSeries(slug);
  const fetchedChapters: SourceChapterSummary[] = detail.chapters;

  if (fetchedChapters.length === 0) {
    await prisma.libraryEntry.updateMany({
      where: { sourceId, slug },
      data: { lastCheckedAt: new Date() },
    });
    return;
  }

  const existing = await prisma.knownChapter.findMany({
    where: { sourceId, slug },
    select: { chapterRef: true },
  });
  const knownRefs = new Set(existing.map((r) => r.chapterRef));
  const isFirstCheck = knownRefs.size === 0;

  const newCount = isFirstCheck
    ? 0
    : fetchedChapters.filter((c) => !knownRefs.has(c.ref)).length;

  await prisma.$transaction(async (tx) => {
    await tx.knownChapter.createMany({
      data: fetchedChapters.map((c) => ({
        sourceId,
        slug,
        chapterRef: c.ref,
        number: c.number,
      })),
      skipDuplicates: true,
    });

    if (newCount > 0) {
      await tx.$executeRaw`
        UPDATE "LibraryEntry"
        SET "unreadCount" = "unreadCount" + ${newCount},
            "lastCheckedAt" = NOW()
        WHERE "sourceId" = ${sourceId}
          AND "slug" = ${slug}
      `;
    } else {
      await tx.libraryEntry.updateMany({
        where: { sourceId, slug },
        data: { lastCheckedAt: new Date() },
      });
    }
  });

  console.log(
    `[worker/updates] ${sourceId}/${slug}: ${fetchedChapters.length} total, ${newCount} new` +
      (isFirstCheck ? " (baseline)" : ""),
  );
}
