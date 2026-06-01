import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { comick } from "./comick";

const BASE = "https://comick.live";

function flareJsonBody(data: unknown): string {
  return `<html><body><pre>${JSON.stringify(data)}</pre></body></html>`;
}

function flareHtmlBody(html: string): string {
  return html;
}

type FetchHandler = (url: string, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}>;

function makeFlareSolverrResponse(responseBody: string, status = 200) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      status: "ok",
      solution: {
        status,
        response: responseBody,
        cookies: [],
        userAgent: "FlareSolverr",
      },
    }),
    text: async () => "",
  };
}

function setupFetch(handlers: FetchHandler[]) {
  let call = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string | URL, init?: RequestInit) => {
    const urlStr = String(url);
    if (init?.method === "POST" && urlStr.includes("flaresolverr")) {
      const h = handlers[Math.min(call++, handlers.length - 1)];
      return h(urlStr, init);
    }
    throw new Error(`Unexpected fetch: ${urlStr} (method=${init?.method})`);
  }));
}

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const searchResponse = {
  data: [
    {
      slug: "solo-leveling",
      hid: "solo-hid",
      title: "Solo Leveling",
      default_thumbnail: "https://cdn1.comicknew.pictures/solo.jpg",
      status: 1,
    },
    {
      slug: "tower-of-god",
      hid: "tog-hid",
      title: "Tower of God",
      default_thumbnail: "https://cdn1.comicknew.pictures/tog.jpg",
      status: 1,
    },
  ],
  next_cursor: null,
};

function makeSeriesHtml(comic: Record<string, unknown>): string {
  return `<html><body><script id="comic-data" type="application/json">${JSON.stringify(comic)}</script></body></html>`;
}

function makeChapterHtml(svData: Record<string, unknown>): string {
  return `<html><body><script id="sv-data" type="application/json">${JSON.stringify(svData)}</script></body></html>`;
}

const comicData = {
  id: 1,
  hid: "solo-hid",
  title: "Solo Leveling",
  slug: "solo-leveling",
  default_thumbnail: "https://cdn1.comicknew.pictures/solo.jpg",
  status: 2,
  desc: "<p>A hunter awakens his abilities.</p>",
  md_titles: [
    { title: "나 혼자만 레벨업", lang: "ko" },
    { title: "Na Honjaman Level Up", lang: "ja-ro" },
  ],
  md_comic_md_genres: [
    { md_genres: { name: "Action" } },
    { md_genres: { name: "Fantasy" } },
  ],
  authors: [{ name: "Chugong" }],
  artists: [{ name: "DUBU" }],
};

const chapterListResponse = {
  data: [
    {
      hid: "hid-200",
      chap: "200",
      lang: "en",
      title: "The Return",
      created_at: "2023-01-01T00:00:00Z",
      group_name: ["Webtoon"],
    },
    {
      hid: "hid-1",
      chap: "1",
      lang: "en",
      title: null,
      created_at: "2020-01-01T00:00:00Z",
      group_name: [],
    },
  ],
  pagination: { current_page: 1, last_page: 1 },
};

const svData = {
  chapter: {
    id: 999,
    hid: "hid-200",
    chap: "200",
    lang: "en",
    images: [
      { url: "https://cdn1.comicknew.pictures/page1.jpg", w: 800, h: 1200 },
      { url: "https://cdn1.comicknew.pictures/page2.jpg", w: 800, h: 1200 },
    ],
  },
};

describe("comick.search()", () => {
  it("maps slug, title, coverUrl, coverReferer correctly", async () => {
    setupFetch([
      async () => makeFlareSolverrResponse(flareJsonBody(searchResponse)),
    ]);

    const results = await comick.search("solo");
    expect(results).toHaveLength(2);
    expect(results[0].slug).toBe("solo-leveling");
    expect(results[0].title).toBe("Solo Leveling");
    expect(results[0].coverUrl).toBe("https://cdn1.comicknew.pictures/solo.jpg");
    expect(results[0].coverReferer).toBe(BASE + "/");
  });

  it("returns empty array when data is empty", async () => {
    setupFetch([
      async () => makeFlareSolverrResponse(flareJsonBody({ data: [], next_cursor: null })),
    ]);

    const results = await comick.search("nonexistent");
    expect(results).toEqual([]);
  });

  it("throws when FlareSolverr returns error status", async () => {
    setupFetch([
      async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          status: "error",
          message: "Challenge failed",
          solution: undefined,
        }),
        text: async () => "",
      }),
    ]);

    await expect(comick.search("test")).rejects.toThrow("FlareSolverr error");
  });
});

describe("comick.getSeries()", () => {
  it("maps title, altTitles, description, author, artist, status, tags", async () => {
    setupFetch([
      async () => makeFlareSolverrResponse(flareHtmlBody(makeSeriesHtml(comicData))),
      async () => makeFlareSolverrResponse(flareJsonBody(chapterListResponse)),
    ]);

    const detail = await comick.getSeries("solo-leveling");
    expect(detail.title).toBe("Solo Leveling");
    expect(detail.altTitles).toContain("나 혼자만 레벨업");
    expect(detail.altTitles).toContain("Na Honjaman Level Up");
    expect(detail.description).toBe("A hunter awakens his abilities.");
    expect(detail.author).toBe("Chugong");
    expect(detail.artist).toBe("DUBU");
    expect(detail.status).toBe("completed"); // status 2 = completed
    expect(detail.tags).toEqual(expect.arrayContaining(["Action", "Fantasy"]));
    expect(detail.coverUrl).toBe("https://cdn1.comicknew.pictures/solo.jpg");
  });

  it("maps altTitles from object-keyed md_titles", async () => {
    const comic = {
      ...comicData,
      md_titles: { ko: ["나 혼자만 레벨업"], "ja-ro": ["Na Honjaman Level Up"] },
    };
    setupFetch([
      async () => makeFlareSolverrResponse(flareHtmlBody(makeSeriesHtml(comic))),
      async () => makeFlareSolverrResponse(flareJsonBody(chapterListResponse)),
    ]);

    const detail = await comick.getSeries("solo-leveling");
    expect(detail.altTitles).toContain("나 혼자만 레벨업");
    expect(detail.altTitles).toContain("Na Honjaman Level Up");
  });

  it("sorts chapters descending by number", async () => {
    setupFetch([
      async () => makeFlareSolverrResponse(flareHtmlBody(makeSeriesHtml(comicData))),
      async () => makeFlareSolverrResponse(flareJsonBody(chapterListResponse)),
    ]);

    const detail = await comick.getSeries("solo-leveling");
    expect(detail.chapters[0].number).toBe("200");
    expect(detail.chapters[1].number).toBe("1");
  });

  it("builds chapter refs as '{hid}-chapter-{chap}-{lang}'", async () => {
    setupFetch([
      async () => makeFlareSolverrResponse(flareHtmlBody(makeSeriesHtml(comicData))),
      async () => makeFlareSolverrResponse(flareJsonBody(chapterListResponse)),
    ]);

    const detail = await comick.getSeries("solo-leveling");
    expect(detail.chapters[0].ref).toBe("hid-200-chapter-200-en");
  });

  it("paginates chapter list across multiple pages", async () => {
    const page1 = {
      data: [{ hid: "h1", chap: "1", lang: "en", title: null, created_at: "2020-01-01T00:00:00Z", group_name: [] }],
      pagination: { current_page: 1, last_page: 2 },
    };
    const page2 = {
      data: [{ hid: "h2", chap: "2", lang: "en", title: null, created_at: "2020-01-02T00:00:00Z", group_name: [] }],
      pagination: { current_page: 2, last_page: 2 },
    };

    setupFetch([
      async () => makeFlareSolverrResponse(flareHtmlBody(makeSeriesHtml(comicData))),
      async () => makeFlareSolverrResponse(flareJsonBody(page1)),
      async () => makeFlareSolverrResponse(flareJsonBody(page2)),
    ]);

    const detail = await comick.getSeries("solo-leveling");
    expect(detail.chapters).toHaveLength(2);
  });
});

describe("comick.getChapter()", () => {
  it("maps image URLs, dimensions, and referer", async () => {
    setupFetch([
      async () => makeFlareSolverrResponse(flareHtmlBody(makeChapterHtml(svData))),
    ]);

    const result = await comick.getChapter("solo-leveling", "hid-200-chapter-200-en");
    expect(result.ref).toBe("hid-200-chapter-200-en");
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].url).toBe("https://cdn1.comicknew.pictures/page1.jpg");
    expect(result.pages[0].referer).toBe(BASE + "/");
    expect(result.pages[0].width).toBe(800);
    expect(result.pages[0].height).toBe(1200);
  });

  it("throws when images array is empty", async () => {
    const emptyData = { chapter: { ...svData.chapter, images: [] } };
    setupFetch([
      async () => makeFlareSolverrResponse(flareHtmlBody(makeChapterHtml(emptyData))),
    ]);

    await expect(
      comick.getChapter("solo-leveling", "hid-200-chapter-200-en"),
    ).rejects.toThrow(/no images/i);
  });
});
