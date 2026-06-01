import type {
  Source,
  SourceSeriesSummary,
  SourceSeriesDetail,
  SourceChapterPages,
  SourceChapterSummary,
  SearchOptions,
} from "./types";

const BASE = "https://comick.live";
const FLARESOLVER_URL =
  process.env.FLARESOLVERR_URL ?? "http://flaresolverr:8191/v1";

interface FlareResponse {
  status: "ok" | "warning" | "error";
  message?: string;
  solution?: {
    status: number;
    response: string;
    cookies: Array<{ name: string; value: string; domain: string }>;
    userAgent: string;
  };
}

async function flareGet(url: string): Promise<string> {
  const res = await fetch(FLARESOLVER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cmd: "request.get", url, maxTimeout: 60000 }),
  });
  if (!res.ok) throw new Error(`FlareSolverr HTTP ${res.status}`);
  const data: FlareResponse = await res.json();
  if (data.status !== "ok" || !data.solution) {
    throw new Error(`FlareSolverr error: ${data.message ?? "unknown"}`);
  }
  if (data.solution.status >= 400) {
    throw new Error(`Comick ${data.solution.status} for ${url}`);
  }
  return data.solution.response;
}

async function flareJson<T>(url: string): Promise<T> {
  const html = await flareGet(url);
  const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/);
  const raw = preMatch ? preMatch[1] : html;
  return JSON.parse(raw) as T;
}

function extractScriptJson(html: string, id: string): unknown {
  const marker = `id="${id}"`;
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) throw new Error(`#${id} not found in page`);
  const openBrace = html.indexOf("{", markerIdx);
  if (openBrace === -1) throw new Error(`#${id}: no JSON object found`);
  let depth = 0;
  let i = openBrace;
  for (; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) break;
    }
  }
  return JSON.parse(html.slice(openBrace, i + 1));
}

interface CkSearchResponse {
  data: CkBrowseComic[];
  next_cursor?: string | null;
}

interface CkBrowseComic {
  slug: string;
  hid: string;
  title: string;
  default_thumbnail?: string;
  country?: string;
  status?: number;
  is_english_title?: boolean;
  limited_titles?: Record<string, string[]>;
}

interface CkChapterListResponse {
  data: CkChapter[];
  pagination: {
    current_page: number;
    last_page: number;
  };
}

interface CkChapter {
  hid: string;
  chap: string;
  vol?: string | null;
  lang: string;
  title?: string | null;
  created_at: string;
  group_name?: string[];
}

interface CkComicData {
  id: number;
  hid: string;
  title: string;
  slug: string;
  default_thumbnail?: string;
  status?: number;
  desc?: string;
  country?: string;
  content_rating?: string;
  translation_completed?: boolean;
  md_titles?: Array<{ title: string; lang?: string }> | Record<string, string[]>;
  md_comic_md_genres?: Array<{ md_genres: { name: string } }>;
  artists?: Array<{ name: string }>;
  authors?: Array<{ name: string }>;
}

interface CkSvData {
  chapter: {
    id: number;
    hid: string;
    chap: string;
    lang: string;
    external_type?: string | null;
    images: Array<{ url: string; w?: number; h?: number; name?: string }>;
    comic?: {
      slug: string;
    };
  };
}

const STATUS_MAP: Record<number, string> = {
  1: "ongoing",
  2: "completed",
  3: "cancelled",
  4: "hiatus",
};

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

function toSummary(c: CkBrowseComic): SourceSeriesSummary {
  return {
    slug: c.slug,
    title: c.title,
    coverUrl: c.default_thumbnail ?? undefined,
    coverReferer: BASE + "/",
  };
}

async function fetchAllChapters(slug: string): Promise<CkChapter[]> {
  const all: CkChapter[] = [];
  let page = 1;
  for (;;) {
    const url = `${BASE}/api/comics/${slug}/chapter-list?lang=en&page=${page}`;
    const data = await flareJson<CkChapterListResponse>(url);
    all.push(...data.data);
    if (data.pagination.current_page >= data.pagination.last_page) break;
    page++;
    if (page > 50) break;
  }
  return all;
}

export const comick: Source = {
  id: "comick",
  name: "Comick",
  language: "en",
  baseUrl: BASE,
  needsCloudflareBypass: true,
  filters: {
    sorts: ["relevance", "popularity", "latest", "alphabetical"],
    statuses: ["any", "ongoing", "completed", "hiatus", "cancelled"],
    contentRatings: ["safe", "suggestive", "erotica"],
  },

  async search(query, opts: SearchOptions = {}): Promise<SourceSeriesSummary[]> {
    const url = new URL(`${BASE}/api/search`);
    url.searchParams.set("type", "comic");
    url.searchParams.set("limit", "24");

    if (query.trim().length >= 3) {
      url.searchParams.set("q", query.trim());
    } else if (query.trim().length > 0) {
      url.searchParams.set("q", query.trim().padEnd(3, " ").trim() || query.trim());
    }

    const sortMap: Record<string, string> = {
      popularity: "user_follow_count",
      latest: "uploaded",
      alphabetical: "title",
      relevance: "uploaded",
    };
    const sort = opts.sort ?? (query.trim() ? "relevance" : "popularity");
    const orderBy = sortMap[sort] ?? "user_follow_count";
    url.searchParams.set("order_by", orderBy);
    url.searchParams.set("order_direction", "desc");

    const statusMap: Record<string, string> = {
      ongoing: "1",
      completed: "2",
      cancelled: "3",
      hiatus: "4",
    };
    if (opts.status && opts.status !== "any") {
      const sv = statusMap[opts.status];
      if (sv) url.searchParams.set("status", sv);
    }

    if (opts.contentRatings && opts.contentRatings.length > 0) {
      for (const cr of opts.contentRatings) {
        url.searchParams.append("content_rating", cr);
      }
    }

    const data = await flareJson<CkSearchResponse>(url.toString());
    return (data.data ?? []).map(toSummary);
  },

  async getSeries(slug): Promise<SourceSeriesDetail> {
    const [pageHtml, chapters] = await Promise.all([
      flareGet(`${BASE}/comic/${slug}`),
      fetchAllChapters(slug),
    ]);

    const comic = extractScriptJson(pageHtml, "comic-data") as CkComicData;

    let altTitles: string[] = [];
    if (Array.isArray(comic.md_titles)) {
      altTitles = comic.md_titles.map((t) => t.title).filter(Boolean);
    } else if (comic.md_titles && typeof comic.md_titles === "object") {
      altTitles = Object.values(comic.md_titles).flat().filter(Boolean) as string[];
    }

    const tags = (comic.md_comic_md_genres ?? [])
      .map((g) => g.md_genres?.name)
      .filter(Boolean) as string[];

    const sourceSummaries: SourceChapterSummary[] = chapters
      .map((c) => ({
        ref: `${c.hid}-chapter-${c.chap}-${c.lang}`,
        number: c.chap,
        title: c.title ?? undefined,
        language: c.lang,
        group: c.group_name?.join(", ") || undefined,
        publishedAt: c.created_at,
      }))
      .sort((a, b) => Number(b.number) - Number(a.number));

    return {
      slug,
      title: comic.title,
      altTitles,
      description: stripHtml(comic.desc),
      coverUrl: comic.default_thumbnail ?? undefined,
      coverReferer: BASE + "/",
      author: (comic.authors ?? []).map((a) => a.name).join(", ") || undefined,
      artist: (comic.artists ?? []).map((a) => a.name).join(", ") || undefined,
      status: comic.status != null ? STATUS_MAP[comic.status] : undefined,
      tags,
      chapters: sourceSummaries,
    };
  },

  async getChapter(slug, chapterRef): Promise<SourceChapterPages> {
    const pageHtml = await flareGet(`${BASE}/comic/${slug}/${chapterRef}`);
    const svData = extractScriptJson(pageHtml, "sv-data") as CkSvData;
    const images = svData.chapter.images ?? [];
    if (images.length === 0) {
      throw new Error("Comick: no images for this chapter (may be external or unavailable)");
    }

    return {
      ref: chapterRef,
      pages: images.map((img) => ({
        url: img.url,
        referer: BASE + "/",
        width: img.w,
        height: img.h,
      })),
    };
  },
};
