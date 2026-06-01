import { backfillTitles } from "@/lib/library";

export async function POST() {
  try {
    const result = await backfillTitles();
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
