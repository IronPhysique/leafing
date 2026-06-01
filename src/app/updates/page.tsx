import Link from "next/link";
import { getUnreadEntries } from "@/lib/queries";
import { resolveDisplayTitle } from "@/lib/metadata/title";
import { proxiedImage } from "@/lib/proxy";
import { CheckUpdatesButton } from "@/components/CheckUpdatesButton";

export const dynamic = "force-dynamic";

export default async function UpdatesPage() {
  const entries = await getUnreadEntries();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Updates</h1>
        <CheckUpdatesButton />
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-2xl ring-1 ring-border">
            ✓
          </div>
          <p className="text-sm text-content-dim">All caught up — no unread chapters.</p>
          <Link
            href="/library"
            className="rounded-lg bg-surface-2 px-4 py-2 text-sm font-medium text-content hover:bg-surface-3"
          >
            Go to Library
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl ring-1 ring-border">
          {entries.map((e) => {
            const displayTitle =
              resolveDisplayTitle({
                english: e.titleEnglish ?? undefined,
                romaji: e.titleRomaji ?? undefined,
              }) || e.title;

            const seriesHref = `/series/${e.sourceId}/${encodeURIComponent(e.slug)}`;
            const latestHref =
              e.latestRef
                ? `/read/${e.sourceId}/${encodeURIComponent(e.slug)}/${encodeURIComponent(e.latestRef)}`
                : seriesHref;

            return (
              <li key={e.id} className="flex items-center gap-4 bg-surface px-4 py-3 transition hover:bg-surface-2">
                <Link href={seriesHref} className="flex-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg">
                  {e.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={proxiedImage(e.coverUrl, e.coverReferer ?? undefined)}
                      alt={displayTitle}
                      className="aspect-[2/3] w-11 rounded-lg object-cover object-center ring-1 ring-border"
                    />
                  ) : (
                    <div className="flex aspect-[2/3] w-11 items-center justify-center rounded-lg bg-surface-2 text-[10px] text-content-dim ring-1 ring-border">
                      No art
                    </div>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link href={seriesHref} className="block truncate font-medium hover:text-accent">
                    {displayTitle}
                  </Link>
                  <p className="mt-0.5 text-xs text-content-dim">
                    {e.unreadCount} new chapter{e.unreadCount !== 1 ? "s" : ""}
                    {e.lastCheckedAt
                      ? ` · checked ${formatRelative(e.lastCheckedAt)}`
                      : ""}
                  </p>
                </div>

                <Link
                  href={latestHref}
                  className="flex-none rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-hover"
                >
                  Read latest
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}
