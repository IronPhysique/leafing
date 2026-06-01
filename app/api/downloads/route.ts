import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { downloadQueue } from "@/lib/queue";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.sourceId || !body?.slug || !body?.chapterRef) {
    return Response.json({ error: "sourceId, slug, chapterRef required" }, { status: 400 });
  }
  const { sourceId, slug, chapterRef, title } = body;

  const download = await prisma.download.upsert({
    where: { sourceId_slug_chapterRef: { sourceId, slug, chapterRef } },
    create: { sourceId, slug, chapterRef, title, status: "queued" },
    update: { status: "queued", error: null },
  });

  await downloadQueue.add(
    "download-chapter",
    { downloadId: download.id, sourceId, slug, chapterRef },
    { jobId: download.id, removeOnComplete: true, removeOnFail: 50 },
  );

  return Response.json({ id: download.id, status: download.status });
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const sourceId = sp.get("sourceId");
  const slug = sp.get("slug");
  if (!sourceId || !slug) {
    return Response.json({ error: "sourceId and slug required" }, { status: 400 });
  }
  const rows = await prisma.download.findMany({ where: { sourceId, slug } });
  return Response.json({
    downloads: rows.map((r) => ({ chapterRef: r.chapterRef, status: r.status })),
  });
}
