import { prisma } from "./db";
import { getActiveProfileId } from "./profile";

export async function getProgressForSeries(sourceId: string, slug: string) {
  const profileId = await getActiveProfileId();
  if (!profileId) return new Map();
  const rows = await prisma.readProgress.findMany({
    where: { profileId, sourceId, slug },
  });
  const byRef = new Map(rows.map((r) => [r.chapterRef, r]));
  return byRef;
}

export async function getChapterProgress(sourceId: string, slug: string, chapterRef: string) {
  const profileId = await getActiveProfileId();
  if (!profileId) return null;
  return prisma.readProgress.findUnique({
    where: { profileId_sourceId_slug_chapterRef: { profileId, sourceId, slug, chapterRef } },
  });
}

export async function getLibrary() {
  const profileId = await getActiveProfileId();
  if (!profileId) return [];
  return prisma.libraryEntry.findMany({
    where: { profileId },
    orderBy: [{ lastReadAt: { sort: "desc", nulls: "last" } }, { addedAt: "desc" }],
    include: {
      categories: { select: { categoryId: true } },
    },
  });
}

export async function getCurrentlyReadingEntries() {
  const profileId = await getActiveProfileId();
  if (!profileId) return [];

  const inProgress = await prisma.readProgress.findMany({
    where: { profileId, finished: false },
    select: { sourceId: true, slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  if (inProgress.length === 0) return [];

  const seen = new Set<string>();
  const deduped: { sourceId: string; slug: string }[] = [];
  for (const row of inProgress) {
    const key = `${row.sourceId}:${row.slug}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push({ sourceId: row.sourceId, slug: row.slug });
    }
  }

  const entries = await prisma.libraryEntry.findMany({
    where: {
      profileId,
      OR: deduped.map(({ sourceId, slug }) => ({ sourceId, slug })),
    },
  });

  const indexMap = new Map(deduped.map((d, i) => [`${d.sourceId}:${d.slug}`, i]));
  return entries
    .filter((e) => indexMap.has(`${e.sourceId}:${e.slug}`))
    .sort(
      (a, b) =>
        (indexMap.get(`${a.sourceId}:${a.slug}`) ?? 999) -
        (indexMap.get(`${b.sourceId}:${b.slug}`) ?? 999)
    );
}

export async function getDownloadsForSeries(sourceId: string, slug: string) {
  const rows = await prisma.download.findMany({ where: { sourceId, slug } });
  return new Map(rows.map((r) => [r.chapterRef, r]));
}

export async function getUnreadEntries() {
  const profileId = await getActiveProfileId();
  if (!profileId) return [] as Array<{ latestRef: string | null; id: string; profileId: string; sourceId: string; slug: string; title: string; coverUrl: string | null; coverReferer: string | null; addedAt: Date; lastReadAt: Date | null; titleEnglish: string | null; titleRomaji: string | null; titleNative: string | null; anilistId: number | null; unreadCount: number; lastCheckedAt: Date | null }>;

  const entries = await prisma.libraryEntry.findMany({
    where: { profileId, unreadCount: { gt: 0 } },
    orderBy: [{ lastCheckedAt: { sort: "desc", nulls: "last" } }, { addedAt: "desc" }],
  });

  if (entries.length === 0) return [] as Array<(typeof entries)[0] & { latestRef: string | null }>;

  const known = await prisma.knownChapter.findMany({
    where: {
      OR: entries.map((e) => ({ sourceId: e.sourceId, slug: e.slug })),
    },
    select: { sourceId: true, slug: true, chapterRef: true, number: true },
  });

  const latestMap = new Map<string, { ref: string; num: number }>();
  for (const row of known) {
    const key = `${row.sourceId}:${row.slug}`;
    const num = parseFloat(row.number);
    const score = isNaN(num) ? -Infinity : num;
    const cur = latestMap.get(key);
    if (!cur || score > cur.num) latestMap.set(key, { ref: row.chapterRef, num: score });
  }

  return entries.map((e) => ({
    ...e,
    latestRef: latestMap.get(`${e.sourceId}:${e.slug}`)?.ref ?? null,
  }));
}
