import type {
  Source,
  SourceSeriesSummary,
  SourceSeriesDetail,
  SourceChapterPages,
  SourceChapterSummary,
  SearchOptions,
  SourcePage,
} from "./types";

const BASE_URL = "https://asurascans.com";
const API_URL = "https://api.asurascans.com/api";
const CDN_REFERER = BASE_URL + "/";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

const RATE_WINDOW_MS = 2_000;
const RATE_MAX = 2;

const requestTimestamps: number[] = [];

async function rateLimit(): Promise<void> {
  const now = Date.now();
  while (requestTimestamps.length > 0 && requestTimestamps[0] < now - RATE_WINDOW_MS) {
    requestTimestamps.shift();
  }
  if (requestTimestamps.length >= RATE_MAX) {
    const oldest = requestTimestamps[0];
    const wait = RATE_WINDOW_MS - (now - oldest) + 10;
    await new Promise<void>((r) => setTimeout(r, wait));
    return rateLimit();
  }
  requestTimestamps.push(Date.now());
}

async function asuraFetch(url: string, extraHeaders?: Record<string, string>): Promise<Response> {
  await rateLimit();
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Referer: CDN_REFERER,
      ...extraHeaders,
    },
  });
  if (!res.ok) throw new Error(`AsuraScans ${res.status} ${url}`);
  return res;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrapAstro(v: unknown): unknown {
  if (Array.isArray(v)) {
    if (v.length === 2 && (v[0] === 0 || v[0] === 1)) {
      return unwrapAstro(v[1]);
    }
    return v.map(unwrapAstro);
  }
  if (v !== null && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = unwrapAstro(val);
    }
    return out;
  }
  return v;
}

function extractAstroProp<T>(html: string, key: string): T {
  const re = new RegExp(`props="([^"]*${key}[^"]*)"`, "s");
  const m = html.match(re);
  if (!m) throw new Error(`AsuraScans: could not find Astro prop "${key}" in HTML`);
  const raw = m[1]
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  const parsed = JSON.parse(raw);
  const unwrapped = unwrapAstro(parsed) as Record<string, unknown>;
  return unwrapped[key] as T;
}

interface ApiMeta {
  total?: number;
  per_page?: number;
  has_more?: boolean;
}

interface ApiSearchResponse {
  data: ApiSeriesItem[];
  meta: ApiMeta;
}

interface ApiSeriesItem {
  id: number;
  slug: string;
  title: string;
  cover: string;
  banner?: string;
  status?: string;
  type?: string;
  author?: string;
  artist?: string;
  description?: string;
  genres?: { id: number; name: string; slug: string }[];
  chapter_count?: number;
  rating?: number;
  public_url: string; // e.g. "/comics/solo-leveling-7b57f74d"
}

interface ApiSeriesDetailResponse {
  series: ApiSeriesItem;
  recommended_series?: ApiSeriesItem[];
}

interface ApiChapter {
  id: number;
  series_id: number;
  number: number;
  title?: string;
  slug: string;
  page_count?: number;
  is_premium?: boolean;
  is_locked?: boolean;
  published_at?: string;
  created_at?: string;
  series_slug?: string;
}

interface ApiChapterList {
  chapters: ApiChapter[];
}

interface ApiPageDto {
  url: string;
  width?: number;
  height?: number;
  tiles?: number[];
  tile_cols?: number;
  tile_rows?: number;
}

interface ApiPageList {
  pages: ApiPageDto[];
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

function parseStatus(status?: string): string | undefined {
  if (!status) return undefined;
  const map: Record<string, string> = {
    ongoing: "ongoing",
    completed: "completed",
    hiatus: "hiatus",
    dropped: "cancelled",
    axed: "cancelled",
  };
  return map[status.toLowerCase()] ?? status.toLowerCase();
}

function randomSlugFromPublicUrl(publicUrl: string): string {
  return publicUrl.split("/").pop() ?? publicUrl;
}

const slugMap = new Map<string, string>();

function toSeriesSummary(item: ApiSeriesItem): SourceSeriesSummary {
  const randomSlug = randomSlugFromPublicUrl(item.public_url);
  slugMap.set(item.slug, randomSlug);
  return {
    slug: randomSlug,
    title: item.title,
    coverUrl: item.cover,
    coverReferer: CDN_REFERER,
  };
}

const PER_PAGE = 20;

export const asurascans: Source = {
  id: "asurascans",
  name: "AsuraScans",
  language: "en",
  baseUrl: BASE_URL,
  filters: {
    sorts: ["relevance", "popularity", "latest", "alphabetical"],
    statuses: ["any", "ongoing", "completed", "hiatus", "cancelled"],
    contentRatings: [],
  },

  async search(query, opts: SearchOptions = {}): Promise<SourceSeriesSummary[]> {
    const page = opts.page ?? 1;
    const url = new URL(`${API_URL}/series`);
    url.searchParams.set("offset", String((page - 1) * PER_PAGE));
    url.searchParams.set("limit", String(PER_PAGE));

    if (query.trim()) {
      url.searchParams.set("search", query.trim());
    }

    const sort = opts.sort ?? (query.trim() ? "relevance" : "popularity");
    if (sort === "popularity") url.searchParams.set("sort_by", "popular");
    else if (sort === "latest") url.searchParams.set("sort_by", "latest");
    else if (sort === "alphabetical") url.searchParams.set("sort_by", "title");

    if (opts.status && opts.status !== "any") {
      const statusMap: Record<string, string> = {
        ongoing: "ongoing",
        completed: "completed",
        hiatus: "hiatus",
        cancelled: "dropped",
      };
      const mapped = statusMap[opts.status];
      if (mapped) url.searchParams.set("status", mapped);
    }

    const run = async (u: URL): Promise<ApiSearchResponse> => {
      const res = await asuraFetch(u.toString());
      return (await res.json()) as ApiSearchResponse;
    };
    let data: ApiSearchResponse;
    try {
      data = await run(url);
    } catch (e) {
      if (query.trim() && !url.searchParams.has("sort_by")) {
        url.searchParams.set("sort_by", "popular");
        data = await run(url);
      } else {
        throw e;
      }
    }

    return (data.data ?? []).map(toSeriesSummary);
  },

  async getSeries(slug): Promise<SourceSeriesDetail> {
    const detailRes = await asuraFetch(`${API_URL}/series/${slug}`);
    const detailData = (await detailRes.json()) as ApiSeriesDetailResponse;
    const s = detailData.series;
    slugMap.set(s.slug, randomSlugFromPublicUrl(s.public_url));

    const htmlRes = await asuraFetch(`${BASE_URL}/comics/${slug}`);
    const html = await htmlRes.text();

    let chapters: SourceChapterSummary[] = [];
    try {
      const chapterArray = extractAstroProp<ApiChapter[] | ApiChapterList>(html, "chapters");
      const rawChapters: ApiChapter[] = Array.isArray(chapterArray)
        ? chapterArray
        : (chapterArray as ApiChapterList).chapters ?? [];
      chapters = rawChapters
        .filter((ch) => !ch.is_premium && !ch.is_locked)
        .map((ch): SourceChapterSummary => {
          const numberStr = String(ch.number).replace(/\.0$/, "");
          return {
            ref: numberStr,
            number: numberStr,
            title: ch.title || undefined,
            language: "en",
            publishedAt: ch.published_at ?? ch.created_at,
          };
        })
        .sort((a, b) => Number(b.number) - Number(a.number));
    } catch (err) {
      throw new Error(`AsuraScans: failed to extract chapter list for ${slug}: ${String(err)}`);
    }

    return {
      slug,
      title: s.title,
      altTitles: [],
      description: stripHtml(s.description),
      coverUrl: s.cover,
      coverReferer: CDN_REFERER,
      author: s.author ?? undefined,
      artist: s.artist ?? undefined,
      status: parseStatus(s.status),
      tags: (s.genres ?? []).map((g) => g.name),
      chapters,
    };
  },

  async getChapter(slug, chapterRef): Promise<SourceChapterPages> {
    const url = `${BASE_URL}/comics/${slug}/chapter/${chapterRef}`;
    const res = await asuraFetch(url);
    const html = await res.text();

    let pages: ApiPageDto[];
    try {
      const rawPages = extractAstroProp<ApiPageDto[] | ApiPageList>(html, "pages");
      pages = Array.isArray(rawPages) ? rawPages : (rawPages as ApiPageList).pages ?? [];
    } catch (err) {
      throw new Error(
        `AsuraScans: failed to extract page list for ${slug} ch${chapterRef}: ${String(err)}`,
      );
    }

    if (pages.length === 0) {
      throw new Error(
        `AsuraScans: no pages found for ${slug} ch${chapterRef} — chapter may be premium/locked`,
      );
    }

    return {
      ref: chapterRef,
      pages: pages.map((p): SourcePage => {
        if (p.tiles && p.tiles.length > 0) {
          return {
            url: p.url,
            referer: CDN_REFERER,
            width: p.width,
            height: p.height,
            descramble: {
              tiles: p.tiles,
              tileCols: p.tile_cols ?? 4,
              tileRows: p.tile_rows ?? 5,
            },
          };
        }
        return {
          url: p.url,
          referer: CDN_REFERER,
          width: p.width,
          height: p.height,
        };
      }),
    };
  },
};
