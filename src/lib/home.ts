import { cached } from "./cache";
import { popularBySource, getSource } from "./sources/index";
import type { AggregatedSeriesSummary } from "./sources/index";
import type { SourceSeriesDetail } from "./sources/types";

export async function featuredSeries(limit = 12): Promise<AggregatedSeriesSummary[]> {
  const shelves = await popularBySource(Math.max(limit, 20));
  if (shelves.length === 0) return [];

  const seen = new Set<string>();
  const out: AggregatedSeriesSummary[] = [];

  const cursors = shelves.map(() => 0);
  const maxLen = Math.max(...shelves.map((s) => s.items.length));

  outer: for (let i = 0; i < maxLen; i++) {
    for (let s = 0; s < shelves.length; s++) {
      const item = shelves[s].items[cursors[s]];
      cursors[s]++;
      if (!item) continue;

      const key = item.title.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      out.push(item);
      if (out.length >= limit) break outer;
    }
  }

  return out;
}

export interface SpotlightSeries {
  sourceId: string;
  slug: string;
  title: string;
  coverUrl?: string;
  coverReferer?: string;
  description?: string;
  status?: string;
  tags?: string[];
}

export async function spotlightSeries(): Promise<SpotlightSeries | null> {
  let top: AggregatedSeriesSummary | undefined;
  try {
    const featured = await featuredSeries(1);
    top = featured[0];
  } catch {
    return null;
  }

  if (!top) return null;

  const { sourceId, slug, title, coverUrl, coverReferer } = top;

  const detail = await cached<SourceSeriesDetail | null>(
    `spotlight-detail:${sourceId}:${slug}`,
    3600,
    async () => {
      try {
        const source = getSource(sourceId);
        return await source.getSeries(slug);
      } catch {
        return null;
      }
    },
  );

  return {
    sourceId,
    slug,
    title: detail?.title ?? title,
    coverUrl: detail?.coverUrl ?? coverUrl,
    coverReferer: detail?.coverReferer ?? coverReferer,
    description: detail?.description,
    status: detail?.status,
    tags: detail?.tags,
  };
}
