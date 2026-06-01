import { NextRequest } from "next/server";
import fs from "node:fs";
import { stat } from "node:fs/promises";
import { resolveLocal } from "@/lib/storage";
import { Readable } from "node:stream";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

export async function GET(_req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await ctx.params;
  const rel = segments.map(decodeURIComponent).join("/");
  const full = resolveLocal(rel);
  if (!full) return new Response("forbidden", { status: 403 });

  try {
    const s = await stat(full);
    if (!s.isFile()) return new Response("not found", { status: 404 });
    const ext = full.slice(full.lastIndexOf(".")).toLowerCase();
    const stream = Readable.toWeb(fs.createReadStream(full)) as ReadableStream;
    return new Response(stream, {
      headers: {
        "Content-Type": MIME[ext] ?? "application/octet-stream",
        "Content-Length": String(s.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
