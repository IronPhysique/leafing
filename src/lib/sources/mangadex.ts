import type {
  Source,
  SourceSeriesSummary,
  SourceSeriesDetail,
  SourceChapterPages,
  SourceChapterSummary,
  SearchOptions,
  SourceSort,
  SourceContentRating,
} from "./types";

const API = "https://api.mangadex.org";
const COVER_HOST = "https://uploads.mangadex.org";

const STATUS_MAP: Record<string, string> = {
  ongoing: "ongoing",
  completed: "completed",
  hiatus: "hiatus",
  cancelled: "cancelled",
};

function sortParams(sort: SourceSort | undefined): Record<string, string> {
  switch (sort) {
    case "popularity":
      return { "order[followedCount]": "desc" };
    case "latest":
      return { "order[latestUploadedChapter]": "desc" };
    case "alphabetical":
      return { "order[title]": "asc" };
    case "relevance":
    default:
      return { "order[relevance]": "desc" };
  }
}

function ratings(cr: SourceContentRating[] | undefined): string[] {
  return cr && cr.length ? cr : ["safe", "suggestive", "erotica"];
}

interface MdManga {
  id: string;
  attributes: {
    title: Record<string, string>;
    altTitles: Array<Record<string, string>>;
    description: Record<string, string>;
    status: string;
    tags: Array<{ attributes: { name: Record<string, string> } }>;
  };
  relationships: Array<{
    id: string;
    type: string;
    attributes?: Record<string, unknown>;
  }>;
}

interface MdChapter {
  id: string;
  attributes: {
    chapter: string | null;
    title: string | null;
    translatedLanguage: string;
    publishAt: string;
    pages: number;
    externalUrl: string | null;
  };
  relationships: Array<{ id: string; type: string; attributes?: { name?: string } }>;
}

function pickTitle(t: Record<string, string>): string {
  return t.en ?? t["ja-ro"] ?? t.ja ?? Object.values(t)[0] ?? "Untitled";
}

function pickDescription(d: Record<string, string> | undefined): string | undefined {
  if (!d) return undefined;
  return d.en ?? Object.values(d)[0];
}

async function md<T>(path: string, params: Record<string, string | string[]> = {}): Promise<T> {
  const url = new URL(API + path);
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((vv) => url.searchParams.append(k, vv));
    else url.searchParams.set(k, v);
  }
  const res = await fetch(url, {
    headers: { "User-Agent": "manhwa-reader/0.1 (personal)" },
  });
  if (!res.ok) throw new Error(`MangaDex ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

export const mangadex: Source = {
  id: "mangadex",
  name: "MangaDex",
  language: "en",
  baseUrl: "https://mangadex.org",
  filters: {
    sorts: ["relevance", "popularity", "latest", "alphabetical"],
    statuses: ["any", "ongoing", "completed", "hiatus", "cancelled"],
    contentRatings: ["safe", "suggestive", "erotica"],
  },

  async search(query, opts: SearchOptions = {}): Promise<SourceSeriesSummary[]> {
    const limit = 24;
    const page = opts.page ?? 1;
    const params: Record<string, string | string[]> = {
      limit: String(limit),
      offset: String((page - 1) * limit),
      "includes[]": ["cover_art"],
      "contentRating[]": ratings(opts.contentRatings),
      ...sortParams(opts.sort ?? (query ? "relevance" : "popularity")),
    };
    if (query.trim()) params.title = query;
    if (opts.status && opts.status !== "any" && STATUS_MAP[opts.status]) {
      params["status[]"] = STATUS_MAP[opts.status];
    }
    const data = await md<{ data: MdManga[] }>("/manga", params);
    return data.data.map((m) => {
      const cover = m.relationships.find((r) => r.type === "cover_art");
      const fileName = cover?.attributes?.fileName as string | undefined;
      return {
        slug: m.id,
        title: pickTitle(m.attributes.title),
        coverUrl: fileName ? `${COVER_HOST}/covers/${m.id}/${fileName}.256.jpg` : undefined,
      };
    });
  },

  async getSeries(slug): Promise<SourceSeriesDetail> {
    const [meta, feed] = await Promise.all([
      md<{ data: MdManga }>(`/manga/${slug}`, { "includes[]": ["cover_art", "author", "artist"] }),
      fetchAllChapters(slug),
    ]);
    const m = meta.data;
    const cover = m.relationships.find((r) => r.type === "cover_art");
    const fileName = cover?.attributes?.fileName as string | undefined;
    const author = m.relationships.find((r) => r.type === "author")?.attributes?.name as
      | string
      | undefined;
    const artist = m.relationships.find((r) => r.type === "artist")?.attributes?.name as
      | string
      | undefined;

    const chapters: SourceChapterSummary[] = feed
      .filter((c) => c.attributes.translatedLanguage === "en")
      .map((c) => ({
        ref: c.id,
        number: c.attributes.chapter ?? "0",
        title: c.attributes.title ?? undefined,
        language: c.attributes.translatedLanguage,
        group: c.relationships.find((r) => r.type === "scanlation_group")?.attributes?.name,
        publishedAt: c.attributes.publishAt,
        externalUrl:
          c.attributes.externalUrl ||
          (c.attributes.pages === 0 ? `https://mangadex.org/chapter/${c.id}` : undefined),
      }))
      .sort((a, b) => Number(b.number) - Number(a.number));

    return {
      slug,
      title: pickTitle(m.attributes.title),
      altTitles: m.attributes.altTitles.map((t) => Object.values(t)[0]).filter(Boolean),
      description: pickDescription(m.attributes.description),
      coverUrl: fileName ? `${COVER_HOST}/covers/${slug}/${fileName}.512.jpg` : undefined,
      author,
      artist,
      status: m.attributes.status,
      tags: m.attributes.tags.map((t) => t.attributes.name.en).filter(Boolean),
      chapters,
    };
  },

  async getChapter(_slug, chapterRef): Promise<SourceChapterPages> {
    const data = await md<{ baseUrl: string; chapter: { hash: string; data: string[] } }>(
      `/at-home/server/${chapterRef}`,
    );
    const pages = data.chapter.data.map((file) => ({
      url: `${data.baseUrl}/data/${data.chapter.hash}/${file}`,
    }));
    return { ref: chapterRef, pages };
  },
};

async function fetchAllChapters(mangaId: string): Promise<MdChapter[]> {
  const limit = 100;
  let offset = 0;
  const out: MdChapter[] = [];
  for (;;) {
    const res = await md<{ data: MdChapter[]; total: number }>(`/manga/${mangaId}/feed`, {
      limit: String(limit),
      offset: String(offset),
      "translatedLanguage[]": ["en"],
      "order[chapter]": "desc",
      "includes[]": ["scanlation_group"],
      "contentRating[]": ["safe", "suggestive", "erotica"],
    });
    out.push(...res.data);
    offset += res.data.length;
    if (res.data.length < limit || offset >= res.total) break;
  }
  return out;
}
