import { NextRequest } from "next/server";
import { getSource } from "@/lib/sources";
import type { SearchOptions, SourceSort, SourceStatus, SourceContentRating } from "@/lib/sources/types";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";

  const opts: SearchOptions = {
    page: Number(sp.get("page") ?? "1"),
    sort: (sp.get("sort") as SourceSort) || undefined,
    status: (sp.get("status") as SourceStatus) || undefined,
    contentRatings: sp.getAll("cr") as SourceContentRating[],
  };

  try {
    const source = getSource(id);
    const results = await source.search(q, opts);
    return Response.json({ results });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
