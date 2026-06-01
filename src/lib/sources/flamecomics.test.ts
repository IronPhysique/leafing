import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// FlameComics fetches the homepage to get a buildId, then uses Next.js _next/data
// endpoints. We stub global fetch to return appropriate responses.
// ---------------------------------------------------------------------------

const BUILD_ID = "test-build-id-1234";
const BASE = "https://flamecomics.xyz";
const CDN = "https://cdn.flamecomics.xyz";

function homepageHtml(buildId: string): string {
  return `<html><head><script id="__NEXT_DATA__" type="application/json">{"buildId":"${buildId}"}</script></head></html>`;
}

// Fixtures
const fcSeries1 = {
  series_id: 42,
  title: "Tower of God",
  cover: "cover.webp",
  last_edit: 1700000000,
  views: 1000000,
  status: "ongoing",
  altTitles: ["신의 탑"],
  description: "<p>A boy climbs a tower.</p>",
  author: ["SIU"],
  artist: ["SIU"],
  tags: ["Action", "Fantasy"],
};

const fcSeries2 = {
  series_id: 43,
  title: "Nano Machine",
  cover: "cover2.webp",
  last_edit: 1700001000,
  views: 500000,
  status: "ongoing",
  altTitles: [],
  description: undefined,
  author: ["Geumgang Bulgye"],
  artist: [],
  tags: [],
};

const fcChapter1 = {
  chapter: 1,
  title: "First Chapter",
  release_date: 1600000000,
  series_id: 42,
  token: "chapter-token-1",
};

const fcChapter100 = {
  chapter: 100,
  title: undefined,
  release_date: 1700000000,
  series_id: 42,
  token: "chapter-token-100",
};

// ---------------------------------------------------------------------------
// Mock fetch factory
// ---------------------------------------------------------------------------

// FlameComics always fetches homepage first (for buildId), then the JSON endpoint.
// We track calls to return appropriate responses.
function setupFetch(
  jsonEndpointPath: string,
  jsonResponse: unknown,
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL) => {
      const urlStr = String(url);
      // Homepage request
      if (urlStr === BASE + "/") {
        return {
          ok: true,
          status: 200,
          text: async () => homepageHtml(BUILD_ID),
          json: async () => ({}),
        };
      }
      // _next/data request
      if (urlStr.includes("/_next/data/")) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify(jsonResponse),
          json: async () => jsonResponse,
        };
      }
      throw new Error(`Unexpected fetch: ${urlStr}`);
    }),
  );
}

// FlameComics has a module-level browseCache and buildId cache. We reset modules
// before each test to get fresh state, then dynamically import the adapter.
// Each test calls getFC() to get the fresh adapter instance.
let fc: typeof import("./flamecomics").flamecomics;

async function getFC() {
  return fc;
}

beforeEach(async () => {
  vi.resetModules();
  const mod = await import("./flamecomics");
  fc = mod.flamecomics;
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// search()
// ---------------------------------------------------------------------------

describe("fc.search()", () => {
  it("returns summaries with correct slug, title, coverUrl", async () => {
    setupFetch("/browse.json", {
      pageProps: { series: [fcSeries1, fcSeries2] },
    });

    const results = await fc.search("");
    expect(results.length).toBeGreaterThanOrEqual(2);

    const towerResult = results.find((r) => r.title === "Tower of God");
    expect(towerResult).toBeDefined();
    expect(towerResult!.slug).toBe("42");
    expect(towerResult!.coverUrl).toContain(`${CDN}/uploads/images/series/42/cover.webp`);
    expect(towerResult!.coverReferer).toBe(BASE + "/");
  });

  it("filters by query (case-insensitive, title match)", async () => {
    setupFetch("/browse.json", {
      pageProps: { series: [fcSeries1, fcSeries2] },
    });

    const results = await fc.search("tower");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Tower of God");
  });

  it("filters by altTitles match", async () => {
    setupFetch("/browse.json", {
      pageProps: { series: [fcSeries1, fcSeries2] },
    });

    const results = await fc.search("신의 탑");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Tower of God");
  });

  it("sorts by popularity (views descending) when no query", async () => {
    setupFetch("/browse.json", {
      pageProps: { series: [fcSeries2, fcSeries1] }, // fcSeries2 first in list
    });

    const results = await fc.search("", { sort: "popularity" });
    // fcSeries1 has 1M views, fcSeries2 has 500K
    expect(results[0].title).toBe("Tower of God");
  });

  it("sorts alphabetically when requested", async () => {
    setupFetch("/browse.json", {
      pageProps: { series: [fcSeries2, fcSeries1] }, // N before T reversed
    });

    const results = await fc.search("", { sort: "alphabetical" });
    expect(results[0].title).toBe("Nano Machine");
    expect(results[1].title).toBe("Tower of God");
  });

  it("filters by status", async () => {
    const completedSeries = { ...fcSeries1, series_id: 99, title: "Completed Series", status: "completed" };
    setupFetch("/browse.json", {
      pageProps: { series: [fcSeries1, fcSeries2, completedSeries] },
    });

    const results = await fc.search("", { status: "completed" });
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Completed Series");
  });
});

// ---------------------------------------------------------------------------
// getSeries()
// ---------------------------------------------------------------------------

describe("fc.getSeries()", () => {
  it("maps title, altTitles, description, author, status, tags, chapters", async () => {
    setupFetch(`/series/42.json`, {
      pageProps: {
        series: fcSeries1,
        chapters: [fcChapter100, fcChapter1],
      },
    });

    const detail = await fc.getSeries("42");
    expect(detail.slug).toBe("42");
    expect(detail.title).toBe("Tower of God");
    expect(detail.altTitles).toEqual(["신의 탑"]);
    expect(detail.description).toBe("A boy climbs a tower.");
    expect(detail.author).toBe("SIU");
    expect(detail.status).toBe("ongoing");
    expect(detail.tags).toEqual(["Action", "Fantasy"]);
    expect(detail.coverUrl).toContain(`${CDN}/uploads/images/series/42/cover.webp`);
  });

  it("sorts chapters descending by number", async () => {
    setupFetch(`/series/42.json`, {
      pageProps: {
        series: fcSeries1,
        chapters: [fcChapter1, fcChapter100],
      },
    });

    const detail = await fc.getSeries("42");
    expect(detail.chapters[0].number).toBe("100");
    expect(detail.chapters[1].number).toBe("1");
  });

  it("sets chapter ref from token", async () => {
    setupFetch(`/series/42.json`, {
      pageProps: {
        series: fcSeries1,
        chapters: [fcChapter1],
      },
    });

    const detail = await fc.getSeries("42");
    expect(detail.chapters[0].ref).toBe("chapter-token-1");
  });

  it("handles missing chapters gracefully", async () => {
    setupFetch(`/series/42.json`, {
      pageProps: { series: fcSeries2 }, // no chapters key
    });

    const detail = await fc.getSeries("43");
    expect(detail.chapters).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getChapter()
// ---------------------------------------------------------------------------

describe("fc.getChapter()", () => {
  it("builds correct page URLs from array images", async () => {
    setupFetch(`/series/42/chapter-token-1.json`, {
      pageProps: {
        chapter: {
          release_date: 1600000000,
          unix_timestamp: 1600000000,
          series_id: 42,
          token: "chapter-token-1",
          images: [
            { name: "page1.webp", width: 800, height: 1200 },
            { name: "page2.webp", width: 800, height: 1200 },
          ],
        },
      },
    });

    const result = await fc.getChapter("42", "chapter-token-1");
    expect(result.ref).toBe("chapter-token-1");
    expect(result.pages).toHaveLength(2);
    expect(result.pages[0].url).toBe(
      `${CDN}/uploads/images/series/42/chapter-token-1/page1.webp?1600000000`,
    );
    expect(result.pages[0].referer).toBe(BASE + "/");
    expect(result.pages[0].width).toBe(800);
    expect(result.pages[0].height).toBe(1200);
  });

  it("handles object-keyed images (legacy format)", async () => {
    setupFetch(`/series/42/chapter-token-2.json`, {
      pageProps: {
        chapter: {
          release_date: 1600000000,
          series_id: 42,
          token: "chapter-token-2",
          images: {
            "0": { name: "a.webp" },
            "1": { name: "b.webp" },
          },
        },
      },
    });

    const result = await fc.getChapter("42", "chapter-token-2");
    expect(result.pages).toHaveLength(2);
  });

  it("uses unix_timestamp over release_date for image URLs when both present", async () => {
    const unix_timestamp = 9999999999;
    setupFetch(`/series/42/chapter-token-ts.json`, {
      pageProps: {
        chapter: {
          release_date: 1000000000,
          unix_timestamp,
          series_id: 42,
          token: "chapter-token-ts",
          images: [{ name: "p.webp" }],
        },
      },
    });

    const result = await fc.getChapter("42", "chapter-token-ts");
    expect(result.pages[0].url).toContain(`?${unix_timestamp}`);
  });
});
