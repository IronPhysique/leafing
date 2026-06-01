import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mangadex } from "./mangadex";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeMdManga(overrides: Partial<{
  id: string;
  titleEn: string;
  altTitles: Array<Record<string, string>>;
  status: string;
  tags: string[];
  coverFileName: string | null;
  authorName: string;
}> = {}) {
  const {
    id = "manga-uuid-1",
    titleEn = "Solo Leveling",
    altTitles = [{ ja: "나 혼자만 레벨업" }, { "ja-ro": "Na Honjaman Level Up" }],
    status = "completed",
    tags = ["Action", "Fantasy"],
    coverFileName = "cover123.jpg",
    authorName = "Chugong",
  } = overrides;
  return {
    id,
    attributes: {
      title: { en: titleEn },
      altTitles,
      description: { en: "A hunter awakens..." },
      status,
      tags: tags.map((name) => ({ attributes: { name: { en: name } } })),
    },
    relationships: [
      {
        id: "cover-rel-id",
        type: "cover_art",
        attributes: coverFileName ? { fileName: coverFileName } : {},
      },
      {
        id: "author-rel-id",
        type: "author",
        attributes: { name: authorName },
      },
    ],
  };
}

function makeMdChapter(overrides: Partial<{
  id: string;
  chapter: string | null;
  title: string | null;
  pages: number;
  externalUrl: string | null;
  lang: string;
  groupName: string;
}> = {}) {
  const {
    id = "chapter-uuid-1",
    chapter = "200",
    title = "The Return",
    pages = 40,
    externalUrl = null,
    lang = "en",
    groupName = "Webtoon",
  } = overrides;
  return {
    id,
    attributes: {
      chapter,
      title,
      translatedLanguage: lang,
      publishAt: "2023-01-01T00:00:00+00:00",
      pages,
      externalUrl,
    },
    relationships: [
      {
        id: "group-rel-id",
        type: "scanlation_group",
        attributes: { name: groupName },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Stub global fetch
// ---------------------------------------------------------------------------

function mockFetch(...responses: { ok: boolean; json?: unknown; text?: string }[]) {
  let call = 0;
  vi.stubGlobal("fetch", vi.fn(async () => {
    const r = responses[Math.min(call++, responses.length - 1)];
    return {
      ok: r.ok,
      status: r.ok ? 200 : 500,
      text: async () => r.text ?? JSON.stringify(r.json ?? {}),
      json: async () => r.json ?? {},
    };
  }));
}

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => vi.unstubAllGlobals());

// ---------------------------------------------------------------------------
// search()
// ---------------------------------------------------------------------------

describe("mangadex.search()", () => {
  it("maps slug, title, and cover URL correctly", async () => {
    const manga = makeMdManga({ id: "abc-123", titleEn: "Solo Leveling", coverFileName: "file.jpg" });
    mockFetch({ ok: true, json: { data: [manga] } });

    const results = await mangadex.search("solo leveling");
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("abc-123");
    expect(results[0].title).toBe("Solo Leveling");
    expect(results[0].coverUrl).toBe("https://uploads.mangadex.org/covers/abc-123/file.jpg.256.jpg");
  });

  it("omits coverUrl when cover_art relationship has no fileName", async () => {
    const manga = makeMdManga({ coverFileName: null });
    // Remove cover_art relationship attributes
    manga.relationships[0].attributes = {};
    mockFetch({ ok: true, json: { data: [manga] } });

    const results = await mangadex.search("solo");
    expect(results[0].coverUrl).toBeUndefined();
  });

  it("returns empty array when data is empty", async () => {
    mockFetch({ ok: true, json: { data: [] } });
    const results = await mangadex.search("");
    expect(results).toEqual([]);
  });

  it("throws when API returns non-ok response", async () => {
    mockFetch({ ok: false, text: "Internal Server Error" });
    await expect(mangadex.search("test")).rejects.toThrow("MangaDex 500");
  });
});

// ---------------------------------------------------------------------------
// getSeries()
// ---------------------------------------------------------------------------

describe("mangadex.getSeries()", () => {
  it("maps title, altTitles, status, tags, author, coverUrl", async () => {
    const manga = makeMdManga({
      id: "series-uuid",
      titleEn: "Solo Leveling",
      altTitles: [{ ja: "나 혼자만 레벨업" }, { "ja-ro": "Na Honjaman Level Up" }],
      status: "completed",
      tags: ["Action", "Fantasy"],
      coverFileName: "cover512.jpg",
      authorName: "Chugong",
    });
    const chapter1 = makeMdChapter({ id: "ch-1", chapter: "1", pages: 30, externalUrl: null });
    const chapter2 = makeMdChapter({ id: "ch-200", chapter: "200", pages: 40, externalUrl: null });

    // getSeries calls: /manga/slug (meta) + /manga/slug/feed (pagination x1)
    mockFetch(
      { ok: true, json: { data: manga } },
      { ok: true, json: { data: [chapter2, chapter1], total: 2 } },
    );

    const detail = await mangadex.getSeries("series-uuid");
    expect(detail.slug).toBe("series-uuid");
    expect(detail.title).toBe("Solo Leveling");
    expect(detail.altTitles).toContain("나 혼자만 레벨업");
    expect(detail.altTitles).toContain("Na Honjaman Level Up");
    expect(detail.status).toBe("completed");
    expect(detail.tags).toEqual(expect.arrayContaining(["Action", "Fantasy"]));
    expect(detail.author).toBe("Chugong");
    expect(detail.coverUrl).toBe(
      "https://uploads.mangadex.org/covers/series-uuid/cover512.jpg.512.jpg",
    );
  });

  it("sorts chapters descending by number", async () => {
    const manga = makeMdManga({ id: "s1" });
    const c1 = makeMdChapter({ id: "c1", chapter: "1" });
    const c5 = makeMdChapter({ id: "c5", chapter: "5" });
    const c3 = makeMdChapter({ id: "c3", chapter: "3" });

    mockFetch(
      { ok: true, json: { data: manga } },
      { ok: true, json: { data: [c1, c3, c5], total: 3 } },
    );

    const detail = await mangadex.getSeries("s1");
    const numbers = detail.chapters.map((c) => c.number);
    expect(numbers).toEqual(["5", "3", "1"]);
  });

  it("filters out non-English chapters from feed", async () => {
    const manga = makeMdManga({ id: "s2" });
    const enChapter = makeMdChapter({ id: "c-en", chapter: "1", lang: "en" });
    const frChapter = makeMdChapter({ id: "c-fr", chapter: "1", lang: "fr" });

    mockFetch(
      { ok: true, json: { data: manga } },
      { ok: true, json: { data: [enChapter, frChapter], total: 2 } },
    );

    const detail = await mangadex.getSeries("s2");
    // Feed is fetched with translatedLanguage[]=en param, but adapter also filters
    expect(detail.chapters.every((c) => c.language === "en")).toBe(true);
    expect(detail.chapters).toHaveLength(1);
  });

  it("sets externalUrl when pages === 0", async () => {
    const manga = makeMdManga({ id: "s3" });
    const extChapter = makeMdChapter({ id: "ext-1", chapter: "1", pages: 0, externalUrl: null });

    mockFetch(
      { ok: true, json: { data: manga } },
      { ok: true, json: { data: [extChapter], total: 1 } },
    );

    const detail = await mangadex.getSeries("s3");
    expect(detail.chapters[0].externalUrl).toBe("https://mangadex.org/chapter/ext-1");
  });

  it("uses provided externalUrl when present", async () => {
    const manga = makeMdManga({ id: "s4" });
    const extChapter = makeMdChapter({
      id: "ext-2",
      chapter: "2",
      pages: 0,
      externalUrl: "https://mangaplus.shueisha.co.jp/viewer/123",
    });

    mockFetch(
      { ok: true, json: { data: manga } },
      { ok: true, json: { data: [extChapter], total: 1 } },
    );

    const detail = await mangadex.getSeries("s4");
    expect(detail.chapters[0].externalUrl).toBe("https://mangaplus.shueisha.co.jp/viewer/123");
  });

  it("does NOT set externalUrl when chapter has pages > 0 and no externalUrl", async () => {
    const manga = makeMdManga({ id: "s5" });
    const normalChapter = makeMdChapter({ id: "c-normal", chapter: "10", pages: 20, externalUrl: null });

    mockFetch(
      { ok: true, json: { data: manga } },
      { ok: true, json: { data: [normalChapter], total: 1 } },
    );

    const detail = await mangadex.getSeries("s5");
    expect(detail.chapters[0].externalUrl).toBeUndefined();
  });

  it("paginates chapter feed when data.length === limit (100)", async () => {
    const manga = makeMdManga({ id: "s6" });
    // First page: 100 chapters (hits the limit), second page: 1 chapter
    const batch1 = Array.from({ length: 100 }, (_, i) =>
      makeMdChapter({ id: `c-${i}`, chapter: String(i + 1) }),
    );
    const batch2 = [makeMdChapter({ id: "c-101", chapter: "101" })];

    mockFetch(
      { ok: true, json: { data: manga } },
      { ok: true, json: { data: batch1, total: 101 } },
      { ok: true, json: { data: batch2, total: 101 } },
    );

    const detail = await mangadex.getSeries("s6");
    expect(detail.chapters).toHaveLength(101);
  });
});

// ---------------------------------------------------------------------------
// getChapter()
// ---------------------------------------------------------------------------

describe("mangadex.getChapter()", () => {
  it("builds correct page URLs from baseUrl + hash + file list", async () => {
    mockFetch({
      ok: true,
      json: {
        baseUrl: "https://uploads.mangadex.org",
        chapter: {
          hash: "abc123",
          data: ["page1.jpg", "page2.jpg"],
        },
      },
    });

    const result = await mangadex.getChapter("any-slug", "chapter-ref-uuid");
    expect(result.ref).toBe("chapter-ref-uuid");
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].url).toBe(
      "https://uploads.mangadex.org/data/abc123/page1.jpg",
    );
    expect(result.pages[1].url).toBe(
      "https://uploads.mangadex.org/data/abc123/page2.jpg",
    );
  });

  it("returns empty pages when data array is empty", async () => {
    mockFetch({
      ok: true,
      json: {
        baseUrl: "https://uploads.mangadex.org",
        chapter: { hash: "h1", data: [] },
      },
    });

    const result = await mangadex.getChapter("slug", "ref");
    expect(result.pages).toHaveLength(0);
  });
});
