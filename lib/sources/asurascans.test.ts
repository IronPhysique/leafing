import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { asurascans } from "./asurascans";

function astroScalar(v: unknown) {
  return [0, v];
}
function astroArray(items: unknown[]) {
  return [1, items.map((x) => astroScalar(x))];
}

function encodeAstroProp(key: string, value: unknown): string {
  let astroValue: unknown;
  if (Array.isArray(value)) {
    astroValue = astroArray(value);
  } else {
    astroValue = astroScalar(value);
  }
  const obj = { [key]: astroValue };
  return JSON.stringify(obj)
    .replace(/"/g, "&quot;")
    .replace(/&/g, "&amp;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function makeAstroPropsHtml(key: string, value: unknown): string {
  const propsObj: Record<string, unknown> = {};
  if (Array.isArray(value)) {
    propsObj[key] = [1, (value as unknown[]).map((x) => [0, x])];
  } else {
    propsObj[key] = [0, value];
  }
  const json = JSON.stringify(propsObj);
  const htmlEncoded = json
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<html><body><div props="${htmlEncoded}"></div></body></html>`;
}

const apiSeriesItem = {
  id: 1,
  slug: "solo-leveling",
  title: "Solo Leveling",
  cover: "https://gg.asuracomic.net/storage/comics/solo.jpg",
  banner: undefined,
  status: "completed",
  type: "manhwa",
  author: "Chugong",
  artist: "DUBU",
  description: "<p>A hunter awakens his true power.</p>",
  genres: [
    { id: 1, name: "Action", slug: "action" },
    { id: 2, name: "Fantasy", slug: "fantasy" },
  ],
  chapter_count: 200,
  rating: 9.5,
  public_url: "/comics/solo-leveling-7b57f74d",
};

const apiChapters: unknown[] = [
  {
    id: 1001,
    series_id: 1,
    number: 200,
    title: "The Return",
    slug: "chapter-200",
    page_count: 40,
    is_premium: false,
    is_locked: false,
    published_at: "2023-01-01T00:00:00Z",
    created_at: "2023-01-01T00:00:00Z",
    series_slug: "solo-leveling",
  },
  {
    id: 1002,
    series_id: 1,
    number: 1,
    title: "Awakening",
    slug: "chapter-1",
    page_count: 30,
    is_premium: false,
    is_locked: false,
    published_at: "2020-01-01T00:00:00Z",
    created_at: "2020-01-01T00:00:00Z",
    series_slug: "solo-leveling",
  },
];

const apiPagesPlain: unknown[] = [
  { url: "https://gg.asuracomic.net/img/page1.jpg", width: 800, height: 1200 },
  { url: "https://gg.asuracomic.net/img/page2.jpg", width: 800, height: 1200 },
];

const apiPagesScrambled: unknown[] = [
  {
    url: "https://gg.asuracomic.net/img/scrambled1.jpg",
    width: 800,
    height: 1000,
    tiles: [3, 1, 0, 2, 7, 5, 4, 6, 11, 9, 8, 10, 15, 13, 12, 14, 19, 17, 16, 18],
    tile_cols: 4,
    tile_rows: 5,
  },
];

function makeOkResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function makeHtmlResponse(html: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => html,
  };
}

function setupFetchSequence(responses: Array<{ ok: boolean; body?: unknown; html?: string }>) {
  let call = 0;
  vi.stubGlobal("fetch", vi.fn(async () => {
    const r = responses[Math.min(call++, responses.length - 1)];
    if (r.html !== undefined) {
      return makeHtmlResponse(r.html);
    }
    if (!r.ok) {
      return { ok: false, status: 500, text: async () => "error", json: async () => ({}) };
    }
    return makeOkResponse(r.body);
  }));
}

beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("asurascans.search()", () => {
  it("maps slug (from public_url), title, coverUrl, coverReferer", async () => {
    setupFetchSequence([
      { ok: true, body: { data: [apiSeriesItem], meta: { total: 1 } } },
    ]);

    const results = await asurascans.search("solo");
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("solo-leveling-7b57f74d");
    expect(results[0].title).toBe("Solo Leveling");
    expect(results[0].coverUrl).toBe("https://gg.asuracomic.net/storage/comics/solo.jpg");
    expect(results[0].coverReferer).toBe("https://asurascans.com/");
  });

  it("returns empty array when data is empty", async () => {
    setupFetchSequence([
      { ok: true, body: { data: [], meta: { total: 0 } } },
    ]);

    const results = await asurascans.search("xxxxxxxxx");
    expect(results).toEqual([]);
  });

  it("throws when API returns non-ok response", async () => {
    setupFetchSequence([{ ok: false }]);
    await expect(asurascans.search("test")).rejects.toThrow("AsuraScans 500");
  });
});

describe("asurascans.getSeries()", () => {
  it("maps title, description, author, artist, status, tags, coverUrl", async () => {
    const detailResp = {
      series: apiSeriesItem,
      recommended_series: [],
    };
    const chaptersHtml = makeAstroPropsHtml("chapters", apiChapters);

    setupFetchSequence([
      { ok: true, body: detailResp },
      { ok: true, html: chaptersHtml },
    ]);

    const detail = await asurascans.getSeries("solo-leveling-7b57f74d");
    expect(detail.slug).toBe("solo-leveling-7b57f74d");
    expect(detail.title).toBe("Solo Leveling");
    expect(detail.description).toBe("A hunter awakens his true power.");
    expect(detail.author).toBe("Chugong");
    expect(detail.artist).toBe("DUBU");
    expect(detail.status).toBe("completed");
    expect(detail.tags).toEqual(expect.arrayContaining(["Action", "Fantasy"]));
    expect(detail.coverUrl).toBe("https://gg.asuracomic.net/storage/comics/solo.jpg");
    expect(detail.coverReferer).toBe("https://asurascans.com/");
  });

  it("sorts chapters descending by number", async () => {
    const detailResp = { series: apiSeriesItem, recommended_series: [] };
    const chaptersHtml = makeAstroPropsHtml("chapters", apiChapters);

    setupFetchSequence([
      { ok: true, body: detailResp },
      { ok: true, html: chaptersHtml },
    ]);

    const detail = await asurascans.getSeries("solo-leveling-7b57f74d");
    expect(detail.chapters[0].number).toBe("200");
    expect(detail.chapters[1].number).toBe("1");
  });

  it("filters out premium/locked chapters", async () => {
    const detailResp = { series: apiSeriesItem, recommended_series: [] };
    const mixedChapters = [
      { ...apiChapters[0] as Record<string, unknown>, number: 200, is_premium: false, is_locked: false },
      { ...apiChapters[1] as Record<string, unknown>, number: 1, is_premium: true, is_locked: false },
    ];
    const chaptersHtml = makeAstroPropsHtml("chapters", mixedChapters);

    setupFetchSequence([
      { ok: true, body: detailResp },
      { ok: true, html: chaptersHtml },
    ]);

    const detail = await asurascans.getSeries("solo-leveling-7b57f74d");
    expect(detail.chapters).toHaveLength(1);
    expect(detail.chapters[0].number).toBe("200");
  });

  it("strips trailing .0 from chapter numbers", async () => {
    const detailResp = { series: apiSeriesItem, recommended_series: [] };
    const chaptersWithDotZero = [
      { id: 1001, series_id: 1, number: 5.0, title: null, slug: "ch-5",
        is_premium: false, is_locked: false, published_at: "2023-01-01T00:00:00Z" },
    ];
    const chaptersHtml = makeAstroPropsHtml("chapters", chaptersWithDotZero);

    setupFetchSequence([
      { ok: true, body: detailResp },
      { ok: true, html: chaptersHtml },
    ]);

    const detail = await asurascans.getSeries("solo-leveling-7b57f74d");
    expect(detail.chapters[0].number).toBe("5");
  });

  it("altTitles is always an empty array", async () => {
    const detailResp = { series: apiSeriesItem, recommended_series: [] };
    const chaptersHtml = makeAstroPropsHtml("chapters", []);

    setupFetchSequence([
      { ok: true, body: detailResp },
      { ok: true, html: chaptersHtml },
    ]);

    const detail = await asurascans.getSeries("solo-leveling-7b57f74d");
    expect(detail.altTitles).toEqual([]);
  });
});

describe("asurascans.getChapter() plain images", () => {
  it("maps page URLs, dimensions, referer — no descramble field", async () => {
    const pagesHtml = makeAstroPropsHtml("pages", apiPagesPlain);
    setupFetchSequence([{ ok: true, html: pagesHtml }]);

    const result = await asurascans.getChapter("solo-leveling-7b57f74d", "200");
    expect(result.ref).toBe("200");
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].url).toBe("https://gg.asuracomic.net/img/page1.jpg");
    expect(result.pages[0].referer).toBe("https://asurascans.com/");
    expect(result.pages[0].width).toBe(800);
    expect(result.pages[0].height).toBe(1200);
    expect((result.pages[0] as { descramble?: unknown }).descramble).toBeUndefined();
  });
});

describe("asurascans.getChapter() scrambled images", () => {
  it("attaches descramble hint with tiles, tileCols, tileRows", async () => {
    const pagesHtml = makeAstroPropsHtml("pages", apiPagesScrambled);
    setupFetchSequence([{ ok: true, html: pagesHtml }]);

    const result = await asurascans.getChapter("solo-leveling-7b57f74d", "1");
    expect(result.pages).toHaveLength(1);

    const page = result.pages[0] as { descramble?: { tiles: number[]; tileCols: number; tileRows: number } };
    expect(page.descramble).toBeDefined();
    expect(page.descramble!.tiles).toHaveLength(20);
    expect(page.descramble!.tileCols).toBe(4);
    expect(page.descramble!.tileRows).toBe(5);
    expect(page.descramble!.tiles[0]).toBe(3);
  });

  it("uses default tileCols=4 and tileRows=5 when not in page data", async () => {
    const pagesMissingDims: unknown[] = [
      {
        url: "https://gg.asuracomic.net/img/scrambled2.jpg",
        tiles: [3, 2, 1, 0],
      },
    ];
    const pagesHtml = makeAstroPropsHtml("pages", pagesMissingDims);
    setupFetchSequence([{ ok: true, html: pagesHtml }]);

    const result = await asurascans.getChapter("slug", "1");
    const page = result.pages[0] as { descramble?: { tileCols: number; tileRows: number } };
    expect(page.descramble).toBeDefined();
    expect(page.descramble!.tileCols).toBe(4);
    expect(page.descramble!.tileRows).toBe(5);
  });
});

describe("asurascans.getChapter() errors", () => {
  it("throws when pages array is empty", async () => {
    const pagesHtml = makeAstroPropsHtml("pages", []);
    setupFetchSequence([{ ok: true, html: pagesHtml }]);

    await expect(
      asurascans.getChapter("solo-leveling-7b57f74d", "200"),
    ).rejects.toThrow(/no pages/i);
  });

  it("throws when Astro prop is not found in HTML", async () => {
    setupFetchSequence([{ ok: true, html: "<html><body><div>no props here</div></body></html>" }]);

    await expect(
      asurascans.getChapter("slug", "1"),
    ).rejects.toThrow(/AsuraScans/);
  });
});

describe("asurascans status parsing (via getSeries)", () => {
  const statusCases: [string, string][] = [
    ["ongoing", "ongoing"],
    ["completed", "completed"],
    ["hiatus", "hiatus"],
    ["dropped", "cancelled"],
    ["axed", "cancelled"],
  ];

  for (const [raw, expected] of statusCases) {
    it(`maps status "${raw}" to "${expected}"`, async () => {
      const item = { ...apiSeriesItem, status: raw };
      const detailResp = { series: item, recommended_series: [] };
      const chaptersHtml = makeAstroPropsHtml("chapters", []);

      setupFetchSequence([
        { ok: true, body: detailResp },
        { ok: true, html: chaptersHtml },
      ]);

      const detail = await asurascans.getSeries("solo-leveling-7b57f74d");
      expect(detail.status).toBe(expected);

      vi.unstubAllGlobals();
      vi.clearAllMocks();
      vi.stubGlobal("fetch", vi.fn());
    });
  }
});
