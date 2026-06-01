import type {
  Source,
  SourceSeriesSummary,
  SourceSeriesDetail,
  SourceChapterPages,
  SourceChapterSummary,
  SearchOptions,
} from "./types";

const BASE = "https://flamecomics.xyz";
const CDN = "https://cdn.flamecomics.xyz";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

let cachedBuildId: string | null = null;
let buildIdFetchedAt = 0;
const BUILD_ID_TTL_MS = 60 * 60 * 1000;

async function getBuildId(force = false): Promise<string> {
  if (!force && cachedBuildId && Date.now() - buildIdFetchedAt < BUILD_ID_TTL_MS) {
    return cachedBuildId;
  }
  const res = await fetch(BASE + "/", { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`FlameComics homepage ${res.status}`);
  const html = await res.text();
  const m = html.match(/"buildId":"([^"]+)"/);
  if (!m) throw new Error("Couldn't find buildId on FlameComics homepage");
  cachedBuildId = m[1];
  buildIdFetchedAt = Date.now();
  return cachedBuildId;
}

async function fc<T>(path: string): Promise<T> {
  let buildId = await getBuildId();
  for (let attempt = 0; attempt < 2; attempt++) {
    const url = `${BASE}/_next/data/${buildId}${path}`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json", Referer: BASE + "/" },
    });
    if (res.status === 404 && attempt === 0) {
      buildId = await getBuildId(true);
      continue;
    }
    if (!res.ok) throw new Error(`FlameComics ${res.status} ${path}`);
    return res.json() as Promise<T>;
  }
  throw new Error("FlameComics buildId refresh failed");
}

function coverUrl(seriesId: number | string, name: string, ts: number | string): string {
  return `${CDN}/uploads/images/series/${seriesId}/${name}?${ts}`;
}

function pageUrl(
  seriesId: number | string,
  chapterToken: string,
  name: string,
  ts: number | string,
): string {
  return `${CDN}/uploads/images/series/${seriesId}/${chapterToken}/${name}?${ts}`;
}

function stripHtml(s?: string): string | undefined {
  if (!s) return undefined;
  const text = s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || undefined;
}

interface FCSeries {
  title: string;
  altTitles?: string[];
  description?: string;
  cover: string;
  type?: string;
  tags?: string[];
  author?: string[];
  artist?: string[];
  status?: string;
  series_id?: number;
  last_edit: number;
  views?: number;
}

interface FCChapter {
  chapter: number | string;
  title?: string;
  release_date: number;
  series_id: number;
  token: string;
}

interface FCBrowseResponse {
  pageProps: { series: FCSeries[] };
}

interface FCSeriesResponse {
  pageProps: { series: FCSeries; chapters?: FCChapter[] };
}

interface FCChapterResponse {
  pageProps: {
    chapter: {
      release_date: number;
      unix_timestamp?: number;
      series_id: number;
      token: string;
      images:
        | Record<string, { name: string; width?: number; height?: number }>
        | Array<{ name: string; width?: number; height?: number }>;
    };
  };
}

let browseCache: { at: number; series: FCSeries[] } | null = null;
const BROWSE_TTL_MS = 10 * 60 * 1000;

async function getBrowse(): Promise<FCSeries[]> {
  if (browseCache && Date.now() - browseCache.at < BROWSE_TTL_MS) return browseCache.series;
  const data = await fc<FCBrowseResponse>("/browse.json");
  browseCache = { at: Date.now(), series: data.pageProps.series };
  return browseCache.series;
}

function toSummary(s: FCSeries): SourceSeriesSummary {
  return {
    slug: String(s.series_id),
    title: s.title,
    coverUrl: s.series_id != null ? coverUrl(s.series_id, s.cover, s.last_edit) : undefined,
    coverReferer: BASE + "/",
  };
}

export const flamecomics: Source = {
  id: "flamecomics",
  name: "FlameComics",
  language: "en",
  baseUrl: BASE,
  filters: {
    sorts: ["relevance", "popularity", "alphabetical"],
    statuses: ["any", "ongoing", "completed", "hiatus"],
    contentRatings: [],
  },

  async search(query, opts: SearchOptions = {}): Promise<SourceSeriesSummary[]> {
    let series = await getBrowse();

    if (query.trim()) {
      const q = query.toLowerCase();
      series = series.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          (s.altTitles ?? []).some((a) => a.toLowerCase().includes(q)),
      );
    }

    if (opts.status && opts.status !== "any") {
      series = series.filter((s) => (s.status ?? "").toLowerCase() === opts.status);
    }

    const sort = opts.sort ?? (query ? "relevance" : "popularity");
    if (sort === "popularity") {
      series = [...series].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    } else if (sort === "alphabetical") {
      series = [...series].sort((a, b) => a.title.localeCompare(b.title));
    }

    return series.slice(0, 60).map(toSummary);
  },

  async getSeries(slug): Promise<SourceSeriesDetail> {
    const data = await fc<FCSeriesResponse>(`/series/${slug}.json?id=${slug}`);
    const s = data.pageProps.series;
    const chapters: SourceChapterSummary[] = (data.pageProps.chapters ?? [])
      .map((c) => ({
        ref: c.token,
        number: String(c.chapter),
        title: c.title || undefined,
        language: "en",
        publishedAt: new Date(c.release_date * 1000).toISOString(),
      }))
      .sort((a, b) => Number(b.number) - Number(a.number));
    return {
      slug,
      title: s.title,
      altTitles: s.altTitles ?? [],
      description: stripHtml(s.description),
      coverUrl: s.series_id != null ? coverUrl(s.series_id, s.cover, s.last_edit) : undefined,
      coverReferer: BASE + "/",
      author: s.author?.join(", "),
      artist: s.artist?.join(", "),
      status: s.status,
      tags: s.tags ?? [],
      chapters,
    };
  },

  async getChapter(slug, chapterRef): Promise<SourceChapterPages> {
    const data = await fc<FCChapterResponse>(
      `/series/${slug}/${chapterRef}.json?id=${slug}&token=${chapterRef}`,
    );
    const ch = data.pageProps.chapter;
    const ts = ch.unix_timestamp ?? ch.release_date;
    const images = Array.isArray(ch.images) ? ch.images : Object.values(ch.images);
    return {
      ref: chapterRef,
      pages: images.map((p) => ({
        url: pageUrl(ch.series_id, ch.token, p.name, ts),
        referer: BASE + "/",
        width: p.width,
        height: p.height,
      })),
    };
  },
};
