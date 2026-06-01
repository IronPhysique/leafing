import { NextRequest } from "next/server";

interface DescrambleHint {
  tiles: number[];
  tileCols: number;
  tileRows: number;
}

function isDescrambleHint(v: unknown): v is DescrambleHint {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    Array.isArray(o.tiles) &&
    typeof o.tileCols === "number" &&
    typeof o.tileRows === "number"
  );
}

async function descrambleImage(
  buffer: Buffer,
  hint: DescrambleHint,
): Promise<Buffer> {
  const sharp = (await import("sharp")).default;

  const { tiles, tileCols, tileRows } = hint;

  const src = sharp(buffer);
  const meta = await src.metadata();
  const srcWidth = meta.width;
  const srcHeight = meta.height;

  if (!srcWidth || !srcHeight) {
    throw new Error("AsuraScans descramble: could not read image dimensions");
  }

  const tileW = Math.floor(srcWidth / tileCols);
  const tileH = Math.floor(srcHeight / tileRows);
  const outWidth = tileW * tileCols;
  const outHeight = tileH * tileRows;

  const compositeOps: { input: Buffer; left: number; top: number }[] = [];

  for (let w = 0; w < tiles.length; w++) {
    const j = tiles[w];

    const srcCol = w % tileCols;
    const srcRow = Math.floor(w / tileCols);
    const dstCol = j % tileCols;
    const dstRow = Math.floor(j / tileCols);

    const tileBuffer = await sharp(buffer)
      .extract({
        left: srcCol * tileW,
        top: srcRow * tileH,
        width: tileW,
        height: tileH,
      })
      .toBuffer();

    compositeOps.push({
      input: tileBuffer,
      left: dstCol * tileW,
      top: dstRow * tileH,
    });
  }

  const output = await sharp({
    create: {
      width: outWidth,
      height: outHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(compositeOps)
    .webp({ quality: 95 })
    .toBuffer();

  return output;
}

export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src");
  const referer = req.nextUrl.searchParams.get("ref") ?? undefined;
  const dsParam = req.nextUrl.searchParams.get("ds") ?? undefined;
  if (!src) return new Response("missing src", { status: 400 });

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return new Response("bad src", { status: 400 });
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return new Response("bad protocol", { status: 400 });
  }

  let descrambleHint: DescrambleHint | null = null;
  if (dsParam) {
    try {
      const parsed = JSON.parse(dsParam);
      if (isDescrambleHint(parsed)) {
        descrambleHint = parsed;
      } else {
        return new Response("bad ds: must be {tiles,tileCols,tileRows}", { status: 400 });
      }
    } catch {
      return new Response("bad ds: invalid JSON", { status: 400 });
    }
  }

  const headers: HeadersInit = {
    "User-Agent": "Mozilla/5.0 manhwa-reader/0.1",
    Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
  };
  if (referer) (headers as Record<string, string>).Referer = referer;

  const upstream = await fetch(url, { headers, redirect: "follow" });
  if (!upstream.ok || !upstream.body) {
    return new Response(`upstream ${upstream.status}`, { status: 502 });
  }

  if (!descrambleHint) {
    const passthrough: HeadersInit = {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "public, max-age=86400, immutable",
    };
    const len = upstream.headers.get("content-length");
    if (len) (passthrough as Record<string, string>)["Content-Length"] = len;
    return new Response(upstream.body, { status: 200, headers: passthrough });
  }

  const arrayBuffer = await upstream.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  let outputBuffer: Buffer;
  try {
    outputBuffer = await descrambleImage(inputBuffer, descrambleHint);
  } catch (err) {
    console.error("[img/descramble] tile reassembly failed:", err);
    return new Response(
      `descramble failed: ${err instanceof Error ? err.message : String(err)}`,
      { status: 500 },
    );
  }

  return new Response(outputBuffer.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(outputBuffer.length),
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
