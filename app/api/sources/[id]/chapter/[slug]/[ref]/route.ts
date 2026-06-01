import { getSource } from "@/lib/sources";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string; slug: string; ref: string }> },
) {
  const { id, slug, ref } = await ctx.params;
  try {
    const source = getSource(id);
    const pages = await source.getChapter(slug, ref);
    return Response.json(pages);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
