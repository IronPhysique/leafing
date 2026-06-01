import { unstable_cache } from "next/cache";
import type { Source, SourceSeriesSummary, SearchOptions } from "./types";
import { mangadex } from "./mangadex";
import { flamecomics } from "./flamecomics";
import { comick } from "./comick";
import { weebcentral } from "./weebcentral";
import { asurascans } from "./asurascans";

export const SOURCES: Record<string, Source> = {
  [mangadex.id]: mangadex,
  [flamecomics.id]: flamecomics,
  [comick.id]: comick,
  [weebcentral.id]: weebcentral,
  [asurascans.id]: asurascans,
};

export function getSource(id: string): Source {
  const s = SOURCES[id];
  if (!s) throw new Error(`Unknown source: ${id}`);
  return s;
}

export function listSources(): Source[] {
  return Object.values(SOURCES);
}

export function sourceBadge(source: Source): string {
  const caps = source.name.replace(/[^A-Z]/g, "");
  if (caps.length >= 2) return caps.slice(0, 3);
  return source.id.slice(0, 2).toUpperCase();
}

export interface AggregatedSeriesSummary extends SourceSeriesSummary {
  sourceId: string;
}

const SEARCH_ALL_TIMEOUT_MS = 8_000;
const SEARCH_ALL_TIMEOUT_CF_MS = 20_000;

export async function searchAll(
  query: string,
  opts?: SearchOptions,
): Promise<AggregatedSeriesSummary[]> {
  const sources = listSources();

  const settled = await Promise.allSettled(
    sources.map((source) => {
      const cap = source.needsCloudflareBypass ? SEARCH_ALL_TIMEOUT_CF_MS : SEARCH_ALL_TIMEOUT_MS;
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Source ${source.id} timed out`)), cap),
      );
      return Promise.race([source.search(query, opts), timeout]).then(
        (results) =>
          results.map((r) => ({ ...r, sourceId: source.id })),
      );
    }),
  );

  const out: AggregatedSeriesSummary[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled") {
      out.push(...result.value);
    }
  }
  return out;
}

export interface PopularSourceShelf {
  sourceId: string;
  name: string;
  badge: string;
  items: AggregatedSeriesSummary[];
}

async function _popularBySource(perSource: number): Promise<PopularSourceShelf[]> {
  const sources = listSources();

  const settled = await Promise.allSettled(
    sources.map((source) => {
      const cap = source.needsCloudflareBypass ? SEARCH_ALL_TIMEOUT_CF_MS : SEARCH_ALL_TIMEOUT_MS;
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Source ${source.id} timed out`)), cap),
      );
      return Promise.race([source.search("", { sort: "popularity" }), timeout]).then(
        (results): PopularSourceShelf => ({
          sourceId: source.id,
          name: source.name,
          badge: sourceBadge(source),
          items: results.slice(0, perSource).map((r) => ({ ...r, sourceId: source.id })),
        }),
      );
    }),
  );

  const out: PopularSourceShelf[] = [];
  for (const result of settled) {
    if (result.status === "fulfilled" && result.value.items.length > 0) {
      out.push(result.value);
    }
  }
  return out;
}

export const popularBySource = unstable_cache(
  _popularBySource,
  ["popular-by-source"],
  { revalidate: 3600 },
);
