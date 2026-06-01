import type {
  Source,
  SourceSeriesSummary,
  SourceSeriesDetail,
  SourceChapterPages,
  SearchOptions,
} from "./types";

const BASE = "https://reaperscans.com";
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
    throw new Error(`ReaperScans ${data.solution.status} for ${url}`);
  }
  return data.solution.response;
}

function isShutdownPage(html: string): boolean {
  return (
    html.includes("Maintenance Mode") ||
    html.includes("Cease and Desist") ||
    html.includes("permanently shut down") ||
    html.includes("Bad gateway")
  );
}

const OFFLINE_ERROR =
  "ReaperScans is permanently offline (Kakao C&D, verified 2026-05-31). " +
  "reaperscans.com serves only a shutdown notice; all /api/* and /series/* paths return 502. " +
  "reapercomics.com (alternate domain) is parked. " +
  "If the site returns, remove this error and implement using the LiveWire endpoint shapes " +
  "documented in lib/sources/reaperscans.ts.";

export const reaperscans: Source = {
  id: "reaperscans",
  name: "ReaperScans",
  language: "en",
  baseUrl: BASE,
  needsCloudflareBypass: true,
  filters: {
    sorts: ["relevance", "popularity", "latest", "alphabetical"],
    statuses: ["any", "ongoing", "completed", "hiatus", "cancelled"],
    contentRatings: [],
  },

  async search(_query: string, _opts: SearchOptions = {}): Promise<SourceSeriesSummary[]> {
    let html: string;
    try {
      html = await flareGet(`${BASE}/series`);
    } catch (err) {
      throw new Error(`ReaperScans search failed: ${OFFLINE_ERROR} (original: ${String(err)})`);
    }
    if (isShutdownPage(html)) {
      throw new Error(`ReaperScans search: ${OFFLINE_ERROR}`);
    }
    throw new Error(
      "ReaperScans: site returned content but search is not yet implemented. " +
        "See LiveWire endpoint docs in lib/sources/reaperscans.ts.",
    );
  },

  async getSeries(_slug: string): Promise<SourceSeriesDetail> {
    let html: string;
    try {
      html = await flareGet(`${BASE}/comics/${_slug}`);
    } catch (err) {
      throw new Error(`ReaperScans getSeries failed: ${OFFLINE_ERROR} (original: ${String(err)})`);
    }
    if (isShutdownPage(html)) {
      throw new Error(`ReaperScans getSeries: ${OFFLINE_ERROR}`);
    }
    throw new Error(
      "ReaperScans: site returned content but getSeries is not yet implemented. " +
        "See LiveWire endpoint docs in lib/sources/reaperscans.ts.",
    );
  },

  async getChapter(_slug: string, _chapterRef: string): Promise<SourceChapterPages> {
    let html: string;
    try {
      html = await flareGet(`${BASE}/comics/${_slug}/${_chapterRef}`);
    } catch (err) {
      throw new Error(
        `ReaperScans getChapter failed: ${OFFLINE_ERROR} (original: ${String(err)})`,
      );
    }
    if (isShutdownPage(html)) {
      throw new Error(`ReaperScans getChapter: ${OFFLINE_ERROR}`);
    }
    throw new Error(
      "ReaperScans: site returned content but getChapter is not yet implemented. " +
        "See image selector docs in lib/sources/reaperscans.ts.",
    );
  },
};
