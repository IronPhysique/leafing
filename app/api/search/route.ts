import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getActiveProfileId } from "@/lib/profile";
import { getSource } from "@/lib/sources";

export interface SearchResult {
  sourceId: string;
  slug: string;
  title: string;
  coverUrl?: string;
  coverReferer?: string;
}

export interface SearchResponse {
  library: SearchResult[];
  sources: SearchResult[];
}

const LIVE_SOURCE = "mangadex";
const LIVE_TIMEOUT_MS = 4000;

async function liveSourceSearch(q: string): Promise<SearchResult[]> {
  try {
    const source = getSource(LIVE_SOURCE);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("source search timeout")), LIVE_TIMEOUT_MS),
    );
    const summaries = await Promise.race([source.search(q, { sort: "relevance" }), timeout]);
    return summaries.slice(0, 8).map((s) => ({
      sourceId: LIVE_SOURCE,
      slug: s.slug,
      title: s.title,
      coverUrl: s.coverUrl,
      coverReferer: s.coverReferer,
    }));
  } catch {
    return [];
  }
}

async function librarySearch(q: string): Promise<SearchResult[]> {
  const profileId = await getActiveProfileId();
  if (!profileId) return [];
  const entries = await prisma.libraryEntry.findMany({
    where: {
      profileId,
      OR: [
        { titleEnglish: { contains: q, mode: "insensitive" } },
        { titleRomaji: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      sourceId: true,
      slug: true,
      title: true,
      titleEnglish: true,
      titleRomaji: true,
      coverUrl: true,
      coverReferer: true,
    },
    orderBy: [{ lastReadAt: { sort: "desc", nulls: "last" } }, { addedAt: "desc" }],
    take: 6,
  });
  return entries.map((e) => ({
    sourceId: e.sourceId,
    slug: e.slug,
    title: e.titleEnglish ?? e.titleRomaji ?? e.title,
    coverUrl: e.coverUrl ?? undefined,
    coverReferer: e.coverReferer ?? undefined,
  }));
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json<SearchResponse>({ library: [], sources: [] });
  }
  const [library, sources] = await Promise.all([librarySearch(q), liveSourceSearch(q)]);
  return NextResponse.json<SearchResponse>({ library, sources });
}
