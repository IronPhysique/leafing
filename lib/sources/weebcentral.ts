import type {
  Source,
  SourceSeriesSummary,
  SourceSeriesDetail,
  SourceChapterPages,
  SourceChapterSummary,
  SearchOptions,
} from "./types";

const BASE = "https://weebcentral.com";
const COVER_CDN = "https://temp.compsci88.com/cover/normal";
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
    throw new Error(`WeebCentral ${data.solution.status} for ${url}`);
  }
  return data.solution.response;
}

function matchAll(html: string, pattern: RegExp): string[] {
  const results: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  while ((m = re.exec(html)) !== null) {
    results.push(m[1]);
  }
  return results;
}

function match1(html: string, pattern: RegExp): string | undefined {
  return pattern.exec(html)?.[1];
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripHtml(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const text = s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return decodeEntities(text) || undefined;
}

function innerText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "").trim());
}

interface WcSearchResult {
  ulid: string;
  nameSlug: string;
  title: string;
  coverUlid: string;
}

function parseSearchResults(html: string): WcSearchResult[] {
  const results: WcSearchResult[] = [];
  // Split on <article class="bg-base-300 ..."> boundaries
  const articleParts = html.split(/<article\s[^>]*bg-base-300[^>]*>/);
  for (const part of articleParts.slice(1)) {
    // First series link in the article
    const hrefMatch = /href="https:\/\/weebcentral\.com\/series\/([A-Z0-9]+)\/([^"]+)"/.exec(part);
    if (!hrefMatch) continue;
    const ulid = hrefMatch[1];
    const nameSlug = hrefMatch[2];

    // Title: look for the line-clamp-1 link (desktop display section)
    const titleMatch = /class="line-clamp-1 link link-hover"[^>]*>([^<]+)</.exec(part);
    const title = titleMatch ? decodeEntities(titleMatch[1].trim()) : nameSlug.replace(/-/g, " ");

    results.push({ ulid, nameSlug, title, coverUlid: ulid });
  }
  return results;
}

interface WcSeriesDetail {
  title: string;
  description?: string;
  coverUrl?: string;
  status?: string;
  author?: string;
  tags: string[];
  altTitles: string[];
}

function parseSeriesDetail(html: string): WcSeriesDetail {
  const titleH1 = match1(html, /<h1[^>]*>([^<]+)<\/h1>/);
  const titleMeta = match1(html, /<meta property="og:title" content="([^"]+)"/);
  let title = titleH1 ?? titleMeta ?? "Untitled";
  title = title.replace(/\s*\|\s*Weeb Central\s*$/i, "").trim();

  const coverUrl = match1(html, /<meta property="og:image" content="([^"]+)"/);

  const descRaw = match1(html, /<p class="whitespace-pre-wrap break-words">([\s\S]*?)<\/p>/);
  const description = stripHtml(descRaw);

  const statusRaw = match1(html, /<strong>Status:\s*<\/strong>\s*<a[^>]*>([^<]+)<\/a>/);
  const status = statusRaw ? normalizeStatus(statusRaw.trim()) : undefined;

  const authorSection = match1(html, /<strong>Author\(s\):\s*<\/strong>([\s\S]*?)<\/li>/);
  const authorLinks = authorSection
    ? matchAll(authorSection, /class="link link-info link-hover">([^<]+)<\/a>/i)
    : [];
  const author = authorLinks.map((a) => decodeEntities(a.trim())).join(", ") || undefined;

  const tagSection = match1(html, /<strong>Tags?\(s\)?:\s*<\/strong>([\s\S]*?)<\/li>/i);
  const tagLinks = tagSection
    ? matchAll(tagSection, /class="link link-info link-hover">([^<]+)<\/a>/i)
    : [];
  const tags = tagLinks.map((t) => decodeEntities(t.trim()));

  const altSection = match1(
    html,
    /Associated Names?[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/i,
  );
  const altTitles = altSection
    ? matchAll(altSection, /<li[^>]*>([^<]+)<\/li>/i).map((t) =>
        decodeEntities(t.trim()),
      )
    : [];

  return {
    title: decodeEntities(title),
    description,
    coverUrl: coverUrl ?? undefined,
    status,
    author,
    tags,
    altTitles,
  };
}

function normalizeStatus(raw: string): string {
  const s = raw.toLowerCase();
  if (s.includes("ongoing") || s.includes("releasing")) return "ongoing";
  if (s.includes("complete") || s.includes("finished")) return "completed";
  if (s.includes("hiatus") || s.includes("paused")) return "hiatus";
  if (s.includes("cancel") || s.includes("drop")) return "cancelled";
  return raw;
}

interface WcChapter {
  ref: string;
  number: string;
  title?: string;
  publishedAt?: string;
  group?: string;
}

function parseChapterList(html: string): WcChapter[] {
  const chapters: WcChapter[] = [];

  const parts = html.split(/<div\s+class="flex items-center"\s+x-data=/);
  for (const part of parts.slice(1)) {
    const chapterUrlMatch = /href="https:\/\/weebcentral\.com\/chapters\/([A-Z0-9]+)"/.exec(part);
    if (!chapterUrlMatch) continue;
    const ref = chapterUrlMatch[1];

    const chNameMatch = /<span class="">([^<]+)<\/span>/.exec(part);
    const chNameRaw = chNameMatch ? chNameMatch[1].trim() : "";
    let number = "0";
    let title: string | undefined;
    const chNumMatch = /Chapter\s+([\d.]+)(?:\s+-\s+(.+))?/i.exec(chNameRaw);
    if (chNumMatch) {
      number = chNumMatch[1];
      title = chNumMatch[2]?.trim() || undefined;
    } else if (chNameRaw) {
      number = chNameRaw;
    }

    const timeMatch = /datetime="([^"]+)"/.exec(part);
    const publishedAt = timeMatch ? new Date(timeMatch[1]).toISOString() : undefined;

    const isOfficial = part.includes('stroke="#d8b4fe"');
    const group = isOfficial ? "Official" : undefined;

    chapters.push({ ref, number, title, publishedAt, group });
  }

  return chapters;
}

interface WcPage {
  url: string;
  width?: number;
  height?: number;
}

function parseChapterImages(html: string): WcPage[] {
  const pages: WcPage[] = [];
  const imgRe = /<img\s+src="(https?:\/\/[^"]+)"[^>]*width="(\d+)"[^>]*height="(\d+)"[^>]*alt="Page \d+"/g;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    pages.push({
      url: m[1],
      width: parseInt(m[2], 10),
      height: parseInt(m[3], 10),
    });
  }
  if (pages.length === 0) {
    const simpleRe = /<img\s+src="(https?:\/\/[^"]+)"[^>]*alt="Page \d+"/g;
    while ((m = simpleRe.exec(html)) !== null) {
      pages.push({ url: m[1] });
    }
  }
  return pages;
}

function seriesDetailUrl(ulid: string): string {
  return `${BASE}/series/${ulid}`;
}

function chapterListUrl(ulid: string): string {
  return `${BASE}/series/${ulid}/full-chapter-list`;
}

function chapterImagesUrl(chapterUlid: string): string {
  return `${BASE}/chapters/${chapterUlid}/images?is_prev=False&reading_style=long_strip`;
}

export const weebcentral: Source = {
  id: "weebcentral",
  name: "Weeb Central",
  language: "en",
  baseUrl: BASE,
  needsCloudflareBypass: true,
  filters: {
    sorts: ["relevance", "popularity", "latest", "alphabetical"],
    statuses: ["any", "ongoing", "completed", "hiatus", "cancelled"],
    contentRatings: [],
  },

  async search(query, opts: SearchOptions = {}): Promise<SourceSeriesSummary[]> {
    const page = opts.page ?? 1;
    const limit = 32;
    const offset = (page - 1) * limit;

    const url = new URL(`${BASE}/search/data`);
    url.searchParams.set("text", query.trim());
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("display_mode", "Full Display");

    const sort = opts.sort ?? (query.trim() ? "relevance" : "popularity");
    if (sort === "popularity") url.searchParams.set("sort", "Popularity");
    else if (sort === "latest") url.searchParams.set("sort", "Latest Updates");
    else if (sort === "alphabetical") url.searchParams.set("sort", "Alphabetical");

    if (opts.status && opts.status !== "any") {
      const statusMap: Record<string, string> = {
        ongoing: "Releasing",
        completed: "Complete",
        hiatus: "Hiatus",
        cancelled: "Cancelled",
      };
      const wcStatus = statusMap[opts.status];
      if (wcStatus) url.searchParams.set("included_status", wcStatus);
    }

    const html = await flareGet(url.toString());
    const results = parseSearchResults(html);

    return results.map((r) => ({
      slug: r.ulid,
      title: r.title,
      coverUrl: `${COVER_CDN}/${r.coverUlid}.webp`,
      coverReferer: BASE + "/",
    }));
  },

  async getSeries(slug): Promise<SourceSeriesDetail> {
    const detailUrl = seriesDetailUrl(slug);
    const [detailHtml, chapterHtml] = await Promise.all([
      flareGet(detailUrl),
      flareGet(chapterListUrl(slug)),
    ]);

    const detail = parseSeriesDetail(detailHtml);
    const rawChapters = parseChapterList(chapterHtml);

    const chapters: SourceChapterSummary[] = rawChapters
      .map((c) => ({
        ref: c.ref,
        number: c.number,
        title: c.title,
        language: "en",
        group: c.group,
        publishedAt: c.publishedAt,
      }))
      .sort((a, b) => parseFloat(b.number) - parseFloat(a.number));

    return {
      slug,
      title: detail.title,
      description: detail.description,
      coverUrl: detail.coverUrl ?? `${COVER_CDN}/${slug}.webp`,
      coverReferer: BASE + "/",
      author: detail.author,
      status: detail.status,
      tags: detail.tags,
      altTitles: detail.altTitles,
      chapters,
    };
  },

  async getChapter(slug, chapterRef): Promise<SourceChapterPages> {
    const url = chapterImagesUrl(chapterRef);
    const html = await flareGet(url);
    const pages = parseChapterImages(html);

    if (pages.length === 0) {
      throw new Error(`WeebCentral: no images found for chapter ${chapterRef}`);
    }

    return {
      ref: chapterRef,
      pages: pages.map((p) => ({
        url: p.url,
        referer: BASE + "/",
        width: p.width,
        height: p.height,
      })),
    };
  },
};
