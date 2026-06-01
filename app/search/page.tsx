import { listSources, searchAll, sourceBadge } from "@/lib/sources";
import type { SearchOptions, SourceContentRating, SourceSeriesSummary } from "@/lib/sources/types";
import type { AggregatedSeriesSummary } from "@/lib/sources";
import { SeriesCard } from "@/components/SeriesCard";
import { SearchControls } from "@/components/SearchControls";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = (sp.q as string) ?? "";
  const sources = listSources();
  const activeId = (sp.source as string) ?? "all";

  const sort = (sp.sort as string) ?? "";
  const status = (sp.status as string) ?? "any";
  const crParam = sp.cr;
  const selectedCr = (Array.isArray(crParam) ? crParam : crParam ? [crParam] : []) as SourceContentRating[];

  const badgeMap: Record<string, string> = Object.fromEntries(
    sources.map((s) => [s.id, sourceBadge(s)]),
  );

  type ResultItem = (SourceSeriesSummary | AggregatedSeriesSummary) & { sourceId?: string };
  let results: ResultItem[] = [];
  let error: string | null = null;

  try {
    const opts: SearchOptions = {
      sort: (sort || undefined) as SearchOptions["sort"],
      status: (status as SearchOptions["status"]) || undefined,
      contentRatings: selectedCr.length ? selectedCr : undefined,
    };

    if (activeId === "all") {
      results = await searchAll(q, opts);
    } else {
      const active = sources.find((s) => s.id === activeId) ?? sources[0];
      const cap = active.needsCloudflareBypass ? 20_000 : 10_000;
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${active.name} is taking too long — try again or pick another source.`)),
          cap,
        ),
      );
      results = await Promise.race([active.search(q, opts), timeout]);
    }
  } catch (e) {
    error = (e as Error).message;
  }

  return (
    <div className="space-y-6">
      <SearchControls
        sources={sources.map((s) => ({ id: s.id, name: s.name, filters: s.filters }))}
        activeId={activeId}
        q={q}
        sort={sort}
        status={status}
        selectedCr={selectedCr}
      />

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {!error && results.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-16 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-surface-2 text-xl ring-1 ring-border">
            🔍
          </div>
          <p className="text-sm text-content-dim">
            {q ? `No results for "${q}".` : "No results."}
          </p>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-3">
        {results.map((r) => {
          const sid = (r as AggregatedSeriesSummary).sourceId ?? activeId;
          return (
            <SeriesCard
              key={`${sid}:${r.slug}`}
              href={`/series/${sid}/${encodeURIComponent(r.slug)}`}
              title={r.title}
              coverUrl={r.coverUrl}
              coverReferer={r.coverReferer}
              badge={activeId === "all" ? badgeMap[sid] : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
