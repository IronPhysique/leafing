import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { weebcentral } from "./weebcentral";

const BASE = "https://weebcentral.com";
const COVER_CDN = "https://temp.compsci88.com/cover/normal";

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

function setupFetchSequence(responses: string[]) {
  let call = 0;
  vi.stubGlobal("fetch", vi.fn(async (_url: string | URL, init?: RequestInit) => {
    if (init?.method === "POST") {
      const body = responses[Math.min(call++, responses.length - 1)];
      return makeFlareSolverrResponse(body);
    }
    throw new Error("Unexpected GET in WeebCentral test");
  }));
}

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function makeSearchArticle(ulid: string, nameSlug: string, title: string): string {
  return `
    <article class="bg-base-300 flex gap-2">
      <a href="https://weebcentral.com/series/${ulid}/${nameSlug}" class="block">
        <img src="${COVER_CDN}/${ulid}.webp" alt="${title}">
      </a>
      <div>
        <a href="https://weebcentral.com/series/${ulid}/${nameSlug}" class="line-clamp-1 link link-hover">${title}</a>
      </div>
    </article>
  `;
}

function makeSearchHtml(articles: string[]): string {
  return `<div>${articles.join("")}</div>`;
}

const SERIES_ULID = "01J76XYCPSY3C4BNPBRY8JMCBE";

function makeSeriesDetailHtml(overrides: {
  title?: string;
  description?: string;
  status?: string;
  author?: string;
  tags?: string[];
  altTitles?: string[];
} = {}): string {
  const {
    title = "Solo Leveling",
    description = "A hunter awakens his true power.",
    status = "Complete",
    author = "Chugong",
    tags = ["Action", "Fantasy"],
    altTitles = ["나 혼자만 레벨업", "Na Honjaman Level Up"],
  } = overrides;

  const tagsHtml = tags.map((t) =>
    `<a href="/tag/${t.toLowerCase()}" class="link link-info link-hover">${t}</a>`,
  ).join(", ");

  const altTitlesHtml = altTitles.map((t) => `<li>${t}</li>`).join("\n");

  return `
    <html>
    <head>
      <meta property="og:title" content="${title} | Weeb Central">
      <meta property="og:image" content="${COVER_CDN}/${SERIES_ULID}.webp">
    </head>
    <body>
      <h1>${title}</h1>
      <ul>
        <li>
          <strong>Status: </strong>
          <a href="/status/complete">${status}</a>
        </li>
        <li>
          <strong>Author(s): </strong>
          <span><a href="/author/chugong" class="link link-info link-hover">${author}</a></span>
        </li>
        <li>
          <strong>Tags(s): </strong>
          ${tagsHtml}
        </li>
      </ul>
      <p class="whitespace-pre-wrap break-words">${description}</p>
      <section>
        <h2>Associated Names</h2>
        <ul>
          ${altTitlesHtml}
        </ul>
      </section>
    </body>
    </html>
  `;
}

function makeChapterListHtml(chapters: Array<{
  ulid: string;
  number: string;
  title?: string;
  datetime?: string;
  official?: boolean;
}>): string {
  return chapters.map((ch) => {
    const chText = ch.title
      ? `Chapter ${ch.number} - ${ch.title}`
      : `Chapter ${ch.number}`;
    const svgOfficial = ch.official
      ? `<svg stroke="#d8b4fe"><path/></svg>`
      : "";
    return `
      <div class="flex items-center" x-data="{}">
        <a href="https://weebcentral.com/chapters/${ch.ulid}">Ch ${ch.number}</a>
        <span class="">${chText}</span>
        <time datetime="${ch.datetime ?? "2023-01-01T00:00:00Z"}">Jan 1</time>
        ${svgOfficial}
      </div>
    `;
  }).join("\n");
}

function makeChapterImagesHtml(pages: Array<{ url: string; width: number; height: number }>): string {
  const imgs = pages.map((p, i) =>
    `<img src="${p.url}" width="${p.width}" height="${p.height}" alt="Page ${i + 1}">`,
  ).join("\n");
  return `<section>${imgs}</section>`;
}

describe("weebcentral.search()", () => {
  it("maps ulid as slug, title, coverUrl, coverReferer", async () => {
    const html = makeSearchHtml([
      makeSearchArticle(SERIES_ULID, "solo-leveling", "Solo Leveling"),
    ]);
    setupFetchSequence([html]);

    const results = await weebcentral.search("solo leveling");
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe(SERIES_ULID);
    expect(results[0].title).toBe("Solo Leveling");
    expect(results[0].coverUrl).toBe(`${COVER_CDN}/${SERIES_ULID}.webp`);
    expect(results[0].coverReferer).toBe(BASE + "/");
  });

  it("returns multiple results", async () => {
    const html = makeSearchHtml([
      makeSearchArticle("ULID00000001", "series-a", "Series A"),
      makeSearchArticle("ULID00000002", "series-b", "Series B"),
    ]);
    setupFetchSequence([html]);

    const results = await weebcentral.search("series");
    expect(results).toHaveLength(2);
    expect(results[0].slug).toBe("ULID00000001");
    expect(results[1].slug).toBe("ULID00000002");
  });

  it("returns empty array when no articles in HTML", async () => {
    setupFetchSequence(["<div>No results found.</div>"]);
    const results = await weebcentral.search("xxxxxxx");
    expect(results).toEqual([]);
  });
});

describe("weebcentral.getSeries()", () => {
  it("maps title, description, status, author, tags, altTitles", async () => {
    const detailHtml = makeSeriesDetailHtml();
    const chapterHtml = makeChapterListHtml([
      { ulid: "CHAP0000200", number: "200", datetime: "2023-12-01T00:00:00Z" },
      { ulid: "CHAP0000001", number: "1", datetime: "2020-01-01T00:00:00Z" },
    ]);
    setupFetchSequence([detailHtml, chapterHtml]);

    const detail = await weebcentral.getSeries(SERIES_ULID);
    expect(detail.title).toBe("Solo Leveling");
    expect(detail.description).toBe("A hunter awakens his true power.");
    expect(detail.status).toBe("completed");
    expect(detail.author).toBe("Chugong");
    expect(detail.tags).toEqual(expect.arrayContaining(["Action", "Fantasy"]));
    expect(detail.altTitles).toContain("나 혼자만 레벨업");
    expect(detail.altTitles).toContain("Na Honjaman Level Up");
  });

  it("strips '| Weeb Central' suffix from og:title fallback", async () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Tower of God | Weeb Central">
        <meta property="og:image" content="${COVER_CDN}/${SERIES_ULID}.webp">
      </head><body></body></html>
    `;
    setupFetchSequence([html, ""]);

    const detail = await weebcentral.getSeries(SERIES_ULID);
    expect(detail.title).toBe("Tower of God");
  });

  it("sorts chapters descending by number", async () => {
    const detailHtml = makeSeriesDetailHtml();
    const chapterHtml = makeChapterListHtml([
      { ulid: "CHAP0001", number: "1" },
      { ulid: "CHAP0050", number: "50" },
      { ulid: "CHAP0200", number: "200" },
    ]);
    setupFetchSequence([detailHtml, chapterHtml]);

    const detail = await weebcentral.getSeries(SERIES_ULID);
    const numbers = detail.chapters.map((c) => c.number);
    expect(numbers).toEqual(["200", "50", "1"]);
  });

  it("extracts chapter title from 'Chapter N - Title' format", async () => {
    const detailHtml = makeSeriesDetailHtml();
    const chapterHtml = makeChapterListHtml([
      { ulid: "CHAP0001", number: "1", title: "Awakening" },
    ]);
    setupFetchSequence([detailHtml, chapterHtml]);

    const detail = await weebcentral.getSeries(SERIES_ULID);
    expect(detail.chapters[0].title).toBe("Awakening");
  });

  it("sets group='Official' for chapters with official SVG marker", async () => {
    const detailHtml = makeSeriesDetailHtml();
    const chapterHtml = makeChapterListHtml([
      { ulid: "CHAP0001", number: "1", official: true },
    ]);
    setupFetchSequence([detailHtml, chapterHtml]);

    const detail = await weebcentral.getSeries(SERIES_ULID);
    expect(detail.chapters[0].group).toBe("Official");
  });

  it("normalizes various status strings correctly", async () => {
    const cases: [string, string][] = [
      ["Releasing", "ongoing"],
      ["Complete", "completed"],
      ["Hiatus", "hiatus"],
      ["Cancelled", "cancelled"],
    ];

    for (const [rawStatus, expected] of cases) {
      const html = makeSeriesDetailHtml({ status: rawStatus });
      setupFetchSequence([html, ""]);
      const detail = await weebcentral.getSeries(SERIES_ULID);
      expect(detail.status).toBe(expected);
      vi.unstubAllGlobals();
      vi.clearAllMocks();
      vi.stubGlobal("fetch", vi.fn());
    }
  });

  it("falls back to COVER_CDN slug URL when og:image is missing", async () => {
    const html = `<html><head></head><body><h1>My Series</h1></body></html>`;
    setupFetchSequence([html, ""]);

    const detail = await weebcentral.getSeries(SERIES_ULID);
    expect(detail.coverUrl).toBe(`${COVER_CDN}/${SERIES_ULID}.webp`);
  });
});

describe("weebcentral.getChapter()", () => {
  it("maps page URLs, dimensions, and referer", async () => {
    const html = makeChapterImagesHtml([
      { url: "https://hot.planeptune.us/img/page1.jpg", width: 800, height: 1200 },
      { url: "https://hot.planeptune.us/img/page2.jpg", width: 800, height: 1200 },
    ]);
    setupFetchSequence([html]);

    const result = await weebcentral.getChapter(SERIES_ULID, "CHAP0001");
    expect(result.ref).toBe("CHAP0001");
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].url).toBe("https://hot.planeptune.us/img/page1.jpg");
    expect(result.pages[0].referer).toBe(BASE + "/");
    expect(result.pages[0].width).toBe(800);
    expect(result.pages[0].height).toBe(1200);
  });

  it("throws when no images found", async () => {
    setupFetchSequence(["<section></section>"]);

    await expect(
      weebcentral.getChapter(SERIES_ULID, "CHAP0001"),
    ).rejects.toThrow(/no images/i);
  });

  it("falls back to simple img pattern when width/height attributes are missing", async () => {
    const html = `<section>
      <img src="https://hot.planeptune.us/img/p1.jpg" alt="Page 1">
      <img src="https://hot.planeptune.us/img/p2.jpg" alt="Page 2">
    </section>`;
    setupFetchSequence([html]);

    const result = await weebcentral.getChapter(SERIES_ULID, "CHAP0001");
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].url).toBe("https://hot.planeptune.us/img/p1.jpg");
    expect(result.pages[0].width).toBeUndefined();
  });
});
