import { getSource } from "@/lib/sources";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string; slug: string }> }) {
  const { id, slug } = await ctx.params;
  try {
    const source = getSource(id);
    const detail = await source.getSeries(slug);
    return Response.json(detail);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
