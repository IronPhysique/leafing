import Link from "next/link";
import { Suspense } from "react";
import { cached } from "@/lib/cache";
import { prisma } from "@/lib/db";
import { getLibrary, getUnreadEntries } from "@/lib/queries";
import { getActiveProfileId } from "@/lib/profile";
import { Cover } from "@/components/Cover";
import { FeaturedBar, type FeaturedItem } from "@/components/FeaturedBar";
import { Reveal } from "@/components/Reveal";
import { resolveDisplayTitle } from "@/lib/metadata/title";
import { nextResume } from "@/lib/progress/resume";
import {
  popularBySource,
  getSource,
  type PopularSourceShelf,
  type AggregatedSeriesSummary,
} from "@/lib/sources/index";
import { proxiedImage } from "@/lib/proxy";
import { humanizeSlug, sourceHue } from "@/lib/pageHelpers";
import type { LibraryEntry } from "@prisma/client";

function getCachedSeriesDetail(sourceId: string, slug: string) {
  return cached(`spotlight-detail:${sourceId}:${slug}`, 3600, () =>
    getSource(sourceId).getSeries(slug),
  );
}

export const dynamic = "force-dynamic";

function chapterLabel(chapterRef: string): string {
  const m = chapterRef.match(/(\d+(?:\.\d+)?)/);
  return m ? `Ch. ${m[1]}` : chapterRef;
}

function FeaturedBarSkeleton() {
  return (
    <div
      className="flex gap-4 overflow-hidden px-6"
      style={{ paddingLeft: "max(1.5rem, calc((100vw - 80rem) / 2 + 1.5rem))" }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="skeleton aspect-[2/3] w-36 flex-none rounded-xl ring-1 ring-border sm:w-44"
        />
      ))}
    </div>
  );
}

function featuredItems(shelves: PopularSourceShelf[], limit = 12): FeaturedItem[] {
  const seen = new Set<string>();
  const items: FeaturedItem[] = [];
  const maxLen = shelves.reduce((m, s) => Math.max(m, s.items.length), 0);
  for (let i = 0; i < maxLen && items.length < limit; i++) {
    for (const shelf of shelves) {
      if (items.length >= limit) break;
      const item = shelf.items[i];
      if (!item) continue;
      const key = `${item.sourceId}/${item.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        sourceId: item.sourceId,
        slug: item.slug,
        title: item.title,
        coverUrl: item.coverUrl,
        coverReferer: item.coverReferer,
        badge: shelf.badge,
      });
    }
  }
  return items;
}

interface SpotlightItem extends AggregatedSeriesSummary {
  badge: string;
  sourceId: string;
  description?: string;
  status?: string;
  tags?: string[];
}

interface SpotlightPanelProps {
  item: SpotlightItem;
  continueRef?: string;
  isFollowed?: boolean;
}

function SpotlightPanel({ item, continueRef, isFollowed: followed }: SpotlightPanelProps) {
  const proxied = item.coverUrl ? proxiedImage(item.coverUrl, item.coverReferer) : null;
  const href = `/series/${item.sourceId}/${encodeURIComponent(item.slug)}`;
  const hue = sourceHue(item.sourceId);

  const tags = (item.tags ?? []).slice(0, 4);

  return (
    <section
      aria-label="Featured series"
      className="relative overflow-hidden rounded-2xl border border-border shadow-card-hover"
      style={{ minHeight: "15rem" }}
    >
      {proxied && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proxied}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-bg/85 backdrop-blur-3xl" />
        </>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/90 to-bg/40" />
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-bg/80 to-transparent" />

      <div
        className="absolute inset-x-0 top-0 h-[2px] opacity-60"
        style={{ background: `hsl(${hue} 70% 55%)` }}
        aria-hidden
      />

      <div className="relative flex items-start gap-6 p-6 sm:gap-8 sm:p-8">
        {proxied && (
          <div className="hidden flex-none sm:block">
            <div className="relative h-44 w-[120px] overflow-hidden rounded-xl shadow-card-hover ring-1 ring-border-strong">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proxied}
                alt={item.title}
                className="h-full w-full object-cover object-center"
              />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <span
            className="w-fit rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ring-1"
            style={{
              background: `hsl(${hue} 70% 15%)`,
              color: `hsl(${hue} 80% 70%)`,
              borderColor: `hsl(${hue} 60% 30%)`,
            }}
          >
            {item.badge}
          </span>

          <h2 className="text-xl font-bold leading-snug text-content sm:text-2xl md:text-3xl">
            {item.title}
          </h2>

          {(item.status || tags.length > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {item.status && item.status !== "unknown" && (
                <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-content-dim ring-1 ring-border capitalize">
                  {item.status}
                </span>
              )}
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-surface px-2 py-0.5 text-[11px] text-content-dim ring-1 ring-border"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {item.description && (
            <p className="line-clamp-2 text-sm leading-relaxed text-content-dim sm:line-clamp-3">
              {item.description}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {continueRef ? (
              <Link
                href={`/read/${item.sourceId}/${encodeURIComponent(item.slug)}/${encodeURIComponent(continueRef)}`}
                className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-bg shadow-card transition-colors motion-safe:hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                Continue {chapterLabel(continueRef)}
              </Link>
            ) : (
              <Link
                href={href}
                className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-bg shadow-card transition-colors motion-safe:hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                View series
              </Link>
            )}
            {continueRef && (
              <Link
                href={href}
                className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-content transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                Series details
              </Link>
            )}
            {!followed && !continueRef && (
              <Link
                href={href}
                className="rounded-lg border border-border px-5 py-2 text-sm font-medium text-content-dim transition-colors hover:bg-surface-2 hover:text-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                + Follow
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function SpotlightSkeleton() {
  return <div className="mt-8 h-60 animate-pulse rounded-2xl bg-surface ring-1 ring-border" />;
}

interface RecentProgressItem {
  sourceId: string;
  slug: string;
  displayTitle: string;
  chapterRef: string;
  page: number;
  scrollOffset: number;
  coverUrl?: string;
  coverReferer?: string;
}

function ContinueReadingCard({ item }: { item: RecentProgressItem }) {
  const proxied = item.coverUrl ? proxiedImage(item.coverUrl, item.coverReferer) : null;
  const readHref = `/read/${item.sourceId}/${encodeURIComponent(item.slug)}/${encodeURIComponent(item.chapterRef)}`;
  const seriesHref = `/series/${item.sourceId}/${encodeURIComponent(item.slug)}`;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl bg-surface shadow-card ring-1 ring-border transition-shadow motion-safe:hover:shadow-card-hover">
      <Link
        href={readHref}
        className="relative block aspect-[2/3] overflow-hidden bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        {proxied ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxied}
            alt={item.displayTitle}
            loading="lazy"
            className="h-full w-full object-cover object-center transition-transform duration-500 motion-safe:group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-content-dim">
            No cover
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-surface-3">
          <div className="h-full w-1/3 rounded-full bg-accent opacity-80" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 pt-8">
          <div className="line-clamp-2 text-xs font-semibold leading-snug text-white drop-shadow">
            {item.displayTitle}
          </div>
        </div>
      </Link>

      <div className="flex flex-col gap-1.5 p-2.5">
        <Link
          href={seriesHref}
          className="line-clamp-1 text-[11px] font-medium leading-snug text-content-dim hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent rounded"
        >
          {item.displayTitle}
        </Link>
        <Link
          href={readHref}
          className="mt-0.5 flex items-center gap-1 rounded-md bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accent ring-1 ring-accent/20 transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
          Continue {chapterLabel(item.chapterRef)}
        </Link>
      </div>
    </div>
  );
}

function ContinueReading({ items }: { items: RecentProgressItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold tracking-tight">Continue reading</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]">
        {items.map((item) => (
          <ContinueReadingCard key={`${item.sourceId}::${item.slug}`} item={item} />
        ))}
      </div>
    </section>
  );
}

interface UpdateItem {
  sourceId: string;
  slug: string;
  displayTitle: string;
  unreadCount: number;
  latestRef: string | null;
  coverUrl?: string | null;
  coverReferer?: string | null;
}

function UpdatesStrip({ items }: { items: UpdateItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold tracking-tight">Updates</h2>
      <ul className="divide-y divide-border overflow-hidden rounded-xl ring-1 ring-border">
        {items.map((u) => {
          const proxied = u.coverUrl ? proxiedImage(u.coverUrl, u.coverReferer ?? undefined) : null;
          const href = u.latestRef
            ? `/read/${u.sourceId}/${encodeURIComponent(u.slug)}/${encodeURIComponent(u.latestRef)}`
            : `/series/${u.sourceId}/${encodeURIComponent(u.slug)}`;
          return (
            <li key={`${u.sourceId}::${u.slug}`}>
              <Link
                href={href}
                className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
              >
                {proxied ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={proxied}
                    alt=""
                    aria-hidden
                    className="aspect-[2/3] h-10 flex-none rounded object-cover object-center ring-1 ring-border"
                  />
                ) : (
                  <div className="aspect-[2/3] h-10 flex-none rounded bg-surface-2 ring-1 ring-border" />
                )}
                <span className="flex-1 truncate font-medium text-content">{u.displayTitle}</span>
                <span className="ml-2 flex-none rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-bg">
                  {u.unreadCount > 99 ? "99+" : u.unreadCount} new
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="flex-none text-content-faint"
                  aria-hidden
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function GridSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="skeleton h-5 w-28 rounded" />
        <div className="skeleton h-4 w-8 rounded" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="skeleton aspect-[2/3] rounded-xl ring-1 ring-border" />
        ))}
      </div>
    </div>
  );
}

function PopularGridSkeletons() {
  return (
    <div className="space-y-12">
      {Array.from({ length: 3 }).map((_, i) => (
        <GridSkeleton key={i} />
      ))}
    </div>
  );
}

function SourceGrid({ shelf }: { shelf: PopularSourceShelf }) {
  const hue = sourceHue(shelf.sourceId);
  const count = shelf.items.length;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="h-5 w-1 flex-none rounded-full opacity-70"
          style={{ background: `hsl(${hue} 65% 55%)` }}
          aria-hidden
        />
        <h3 className="text-lg font-bold leading-none">{shelf.name}</h3>
        <span
          className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1"
          style={{
            background: `hsl(${hue} 60% 12%)`,
            color: `hsl(${hue} 75% 65%)`,
            borderColor: `hsl(${hue} 50% 25%)`,
          }}
        >
          {shelf.badge}
        </span>
        <span className="text-xs text-content-dim">{count} shown</span>
        <div className="flex-1" />
        <Link
          href={`/search?source=${shelf.sourceId}&sort=popularity`}
          className="text-xs text-content-dim transition-colors hover:text-accent"
        >
          See all →
        </Link>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(9rem,1fr))]">
        {shelf.items.map((item) => (
          <Cover
            key={`${item.sourceId}/${item.slug}`}
            href={`/series/${item.sourceId}/${encodeURIComponent(item.slug)}`}
            title={item.title}
            coverUrl={item.coverUrl}
            coverReferer={item.coverReferer}
            vtKey={`${item.sourceId}/${item.slug}`}
          />
        ))}
      </div>
    </section>
  );
}

async function PopularGrids() {
  const shelves = await popularBySource(12);
  if (shelves.length === 0) return null;
  return (
    <div className="space-y-12">
      {shelves.map((shelf) => (
        <SourceGrid key={shelf.sourceId} shelf={shelf} />
      ))}
    </div>
  );
}

async function FeaturedSection({
  profileProgressMap,
  followedKeys,
}: {
  profileProgressMap: Map<string, string>;
  followedKeys: Set<string>;
}) {
  const shelves = await popularBySource(12);
  if (shelves.length === 0) return null;

  let spotlightBase: (AggregatedSeriesSummary & { badge: string; sourceId: string }) | null = null;
  for (const shelf of shelves) {
    const candidate = shelf.items.find((i) => i.coverUrl);
    if (candidate) {
      spotlightBase = { ...candidate, badge: shelf.badge };
      break;
    }
  }

  let spotlight: SpotlightItem | null = null;
  if (spotlightBase) {
    try {
      const detail = await getCachedSeriesDetail(spotlightBase.sourceId, spotlightBase.slug);
      spotlight = {
        ...spotlightBase,
        description: detail.description,
        status: detail.status,
        tags: detail.tags,
      };
    } catch {
      spotlight = { ...spotlightBase };
    }
  }

  const items = featuredItems(shelves);
  const key = spotlight ? `${spotlight.sourceId}::${spotlight.slug}` : null;
  const continueRef = key ? profileProgressMap.get(key) : undefined;
  const isFollowedSpotlight = key ? followedKeys.has(key) : false;

  return (
    <>
      <div className="w-screen relative left-1/2 -translate-x-1/2">
        <FeaturedBar items={items} />
      </div>

      {spotlight && (
        <Reveal className="mt-8">
          <SpotlightPanel
            item={spotlight}
            continueRef={continueRef}
            isFollowed={isFollowedSpotlight}
          />
        </Reveal>
      )}
    </>
  );
}

function FeaturedSectionSkeleton() {
  return (
    <>
      <div className="w-screen relative left-1/2 -translate-x-1/2">
        <FeaturedBarSkeleton />
      </div>
      <SpotlightSkeleton />
    </>
  );
}

function EmptyActivityPrompt() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <span className="text-lg" aria-hidden>
        📖
      </span>
      <p className="flex-1 text-sm text-content-dim">
        Follow a series to track your progress and get update notifications.
      </p>
      <Link
        href="/search"
        className="flex-none rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-bg transition-colors motion-safe:hover:bg-accent-hover"
      >
        Discover series
      </Link>
    </div>
  );
}

export default async function Home() {
  const profileId = await getActiveProfileId();

  const [library, rawProgress, unreadEntries] = await Promise.all([
    profileId
      ? (async () => {
          const { getLibrary } = await import("@/lib/queries");
          return getLibrary();
        })()
      : Promise.resolve([] as LibraryEntry[]),
    profileId
      ? prisma.readProgress.findMany({
          where: { profileId },
          orderBy: { updatedAt: "desc" },
          take: 100,
        })
      : Promise.resolve([] as Awaited<ReturnType<typeof prisma.readProgress.findMany>>),
    profileId
      ? (async () => {
          const { getUnreadEntries } = await import("@/lib/queries");
          return getUnreadEntries();
        })()
      : Promise.resolve([] as Awaited<ReturnType<typeof import("@/lib/queries").getUnreadEntries>>),
  ]);

  const followedKeys = new Set<string>(
    (library as LibraryEntry[]).map((e) => `${e.sourceId}::${e.slug}`)
  );

  const libraryMap = new Map<string, LibraryEntry>(
    (library as LibraryEntry[]).map((e) => [`${e.sourceId}::${e.slug}`, e])
  );

  const seriesMap = new Map<
    string,
    { sourceId: string; slug: string; rows: typeof rawProgress }
  >();
  for (const row of rawProgress) {
    const key = `${row.sourceId}::${row.slug}`;
    if (!seriesMap.has(key)) {
      seriesMap.set(key, { sourceId: row.sourceId, slug: row.slug, rows: [] });
    }
    seriesMap.get(key)!.rows.push(row);
  }

  const progressMap = new Map<string, string>();
  for (const [key, { sourceId, slug, rows }] of seriesMap) {
    const resume = nextResume(
      rows.map((r) => ({
        chapterRef: r.chapterRef,
        page: r.page,
        scrollOffset: r.scrollOffset,
        finished: r.finished,
        updatedAt: r.updatedAt.getTime(),
      }))
    );
    if (resume) progressMap.set(key, resume.chapterRef);
  }

  const recentProgress: RecentProgressItem[] = [...seriesMap.values()]
    .map(({ sourceId, slug, rows }) => {
      const resume = nextResume(
        rows.map((r) => ({
          chapterRef: r.chapterRef,
          page: r.page,
          scrollOffset: r.scrollOffset,
          finished: r.finished,
          updatedAt: r.updatedAt.getTime(),
        }))
      );
      if (!resume) return null;
      const libEntry = libraryMap.get(`${sourceId}::${slug}`);
      const displayTitle = libEntry
        ? resolveDisplayTitle({
            english: libEntry.titleEnglish ?? undefined,
            romaji: libEntry.titleRomaji ?? undefined,
          }) || libEntry.title
        : humanizeSlug(slug);
      return {
        sourceId,
        slug,
        displayTitle,
        coverUrl: libEntry?.coverUrl ?? undefined,
        coverReferer: libEntry?.coverReferer ?? undefined,
        ...resume,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 10);

  const updateItems: UpdateItem[] = (
    unreadEntries as Array<{
      sourceId: string;
      slug: string;
      title: string;
      titleEnglish: string | null;
      titleRomaji: string | null;
      unreadCount: number;
      latestRef: string | null;
      coverUrl: string | null;
      coverReferer: string | null;
    }>
  )
    .slice(0, 8)
    .map((e) => ({
      sourceId: e.sourceId,
      slug: e.slug,
      displayTitle:
        resolveDisplayTitle({
          english: e.titleEnglish ?? undefined,
          romaji: e.titleRomaji ?? undefined,
        }) || e.title,
      unreadCount: e.unreadCount,
      latestRef: e.latestRef,
      coverUrl: e.coverUrl,
      coverReferer: e.coverReferer,
    }));

  const hasActivity = followedKeys.size > 0 || progressMap.size > 0;

  return (
    <div className="space-y-12">
      {hasActivity ? (
        <>
          {recentProgress.length > 0 && (
            <Reveal>
              <ContinueReading items={recentProgress} />
            </Reveal>
          )}

          {updateItems.length > 0 && (
            <Reveal delay={0.05}>
              <UpdatesStrip items={updateItems} />
            </Reveal>
          )}

          {recentProgress.length === 0 && updateItems.length === 0 && (
            <EmptyActivityPrompt />
          )}

          <Suspense fallback={<FeaturedSectionSkeleton />}>
            <FeaturedSection
              profileProgressMap={progressMap}
              followedKeys={followedKeys}
            />
          </Suspense>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Popular</h2>
            <Suspense fallback={<PopularGridSkeletons />}>
              <PopularGrids />
            </Suspense>
          </section>
        </>
      ) : (
        <>
          <Suspense fallback={<FeaturedSectionSkeleton />}>
            <FeaturedSection
              profileProgressMap={progressMap}
              followedKeys={followedKeys}
            />
          </Suspense>

          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Popular</h2>
            <Suspense fallback={<PopularGridSkeletons />}>
              <PopularGrids />
            </Suspense>
          </section>

          <EmptyActivityPrompt />
        </>
      )}
    </div>
  );
}
