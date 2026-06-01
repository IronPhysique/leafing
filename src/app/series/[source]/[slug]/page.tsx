import Link from "next/link";
import { getSource } from "@/lib/sources";
import { proxiedImage } from "@/lib/proxy";
import { isFollowed, getCategories } from "@/lib/library";
import { getProgressForSeries, getDownloadsForSeries } from "@/lib/queries";
import { prisma } from "@/lib/db";
import { FollowButton } from "@/components/FollowButton";
import { ChapterRow } from "@/components/ChapterRow";
import { resolveDisplayTitle } from "@/lib/metadata/title";
import { nextResume } from "@/lib/progress/resume";
import { coverVtName } from "@/lib/vt";
import { CategoryPicker } from "@/components/CategoryPicker";

export const dynamic = "force-dynamic";

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ source: string; slug: string }>;
}) {
  const { source, slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const detail = await getSource(source).getSeries(slug);

  const [followed, progress, downloads, libraryEntry, allCategories] = await Promise.all([
    isFollowed(source, slug),
    getProgressForSeries(source, slug),
    getDownloadsForSeries(source, slug),
    (async () => {
      const { getActiveProfileId } = await import("@/lib/profile");
      const profileId = await getActiveProfileId();
      if (!profileId) return null;
      return prisma.libraryEntry.findUnique({
        where: { profileId_sourceId_slug: { profileId, sourceId: source, slug } },
        include: { categories: { select: { categoryId: true } } },
      });
    })(),
    getCategories(),
  ]);

  const progressRows = [...progress.values()].map((r) => ({
    chapterRef: r.chapterRef,
    page: r.page,
    scrollOffset: r.scrollOffset,
    finished: r.finished,
    updatedAt: r.updatedAt.getTime(),
  }));
  const resumePoint = nextResume(progressRows);
  const resumeRef =
    resumePoint?.chapterRef ??
    ([...detail.chapters].reverse().find((c) => !c.externalUrl && !progress.get(c.ref)?.finished)?.ref ?? null);

  const proxiedCover = detail.coverUrl
    ? proxiedImage(detail.coverUrl, detail.coverReferer)
    : null;

  return (
    <div className="space-y-8">
      <div className="relative -mx-6 -mt-8 overflow-hidden px-6 pt-8">
        {proxiedCover && (
          <div aria-hidden className="absolute inset-0 -z-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proxiedCover}
              alt=""
              className="h-full w-full scale-110 object-cover blur-2xl saturate-150"
            />
            <div className="absolute inset-0 bg-bg/70" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
          </div>
        )}
        <div className="flex flex-col gap-6 pb-2 sm:flex-row">
          {proxiedCover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proxiedCover}
              alt={detail.title}
              style={{ viewTransitionName: coverVtName(`${source}/${slug}`) }}
              className="h-72 w-48 flex-none self-center rounded-xl object-cover object-center shadow-card-hover ring-1 ring-border sm:self-start"
            />
          )}
          <div className="flex-1 space-y-3">
          <h1 className="text-2xl font-bold leading-tight">
            {followed && libraryEntry
              ? (resolveDisplayTitle({
                  english: libraryEntry.titleEnglish ?? undefined,
                  romaji: libraryEntry.titleRomaji ?? undefined,
                }) || detail.title)
              : detail.title}
          </h1>
          {detail.altTitles?.length ? (
            <p className="text-sm text-content-dim">{detail.altTitles.slice(0, 3).join(" · ")}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <FollowButton
              sourceId={source}
              slug={slug}
              title={detail.title}
              coverUrl={detail.coverUrl}
              coverReferer={detail.coverReferer}
              initiallyFollowed={followed}
            />
            {resumeRef && (
              <Link
                href={`/read/${source}/${encodeURIComponent(slug)}/${encodeURIComponent(resumeRef)}`}
                className="rounded-md bg-surface-2 px-4 py-2 text-sm font-medium hover:bg-surface-3"
              >
                Continue reading
              </Link>
            )}
            {followed && allCategories.length > 0 && (
              <CategoryPicker
                sourceId={source}
                slug={slug}
                categories={allCategories}
                assignedIds={libraryEntry?.categories?.map((c: { categoryId: string }) => c.categoryId) ?? []}
                followed={followed}
              />
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-content-dim">
            {detail.author && <span>✍ {detail.author}</span>}
            {detail.artist && detail.artist !== detail.author && <span>🎨 {detail.artist}</span>}
            {detail.status && <span className="capitalize">● {detail.status}</span>}
          </div>

          {detail.tags?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {detail.tags.slice(0, 14).map((t) => (
                <span key={t} className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-content-dim ring-1 ring-border">
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          {detail.description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-content/90">
              {detail.description.slice(0, 600)}
              {detail.description.length > 600 ? "…" : ""}
            </p>
          )}
          </div>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Chapters ({detail.chapters.length})</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-lg ring-1 ring-border">
          {detail.chapters.map((c) => {
            const p = progress.get(c.ref);
            const d = downloads.get(c.ref);
            return (
              <ChapterRow
                key={c.ref}
                source={source}
                slug={slug}
                chapter={c}
                read={p?.finished ?? false}
                pageProgress={p && !p.finished ? p.page : undefined}
                downloadStatus={d?.status}
              />
            );
          })}
        </ul>
      </section>
    </div>
  );
}
