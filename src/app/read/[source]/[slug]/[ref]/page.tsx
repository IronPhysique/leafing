import { getSource } from "@/lib/sources";
import { prisma } from "@/lib/db";
import { proxiedImage } from "@/lib/proxy";
import { getChapterProgress } from "@/lib/queries";
import { chapterDir, listChapterFiles, safe } from "@/lib/storage";
import { Reader } from "@/components/Reader";
import path from "node:path";

export const dynamic = "force-dynamic";

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ source: string; slug: string; ref: string }>;
}) {
  const { source, slug: rawSlug, ref: rawRef } = await params;
  const slug = decodeURIComponent(rawSlug);
  const ref = decodeURIComponent(rawRef);
  const src = getSource(source);

  const detail = await src.getSeries(slug);
  const idx = detail.chapters.findIndex((c) => c.ref === ref);
  const current = detail.chapters[idx];
  const next = idx > 0 ? detail.chapters[idx - 1] : undefined;
  const prev = idx >= 0 && idx < detail.chapters.length - 1 ? detail.chapters[idx + 1] : undefined;

  const download = await prisma.download.findUnique({
    where: { sourceId_slug_chapterRef: { sourceId: source, slug, chapterRef: ref } },
  });

  let pages: { src: string; width?: number; height?: number }[];
  if (download?.status === "done") {
    const dir = chapterDir(source, slug, ref);
    const files = await listChapterFiles(dir);
    const base = `/api/local/${safe(source)}/${safe(slug)}/${safe(ref)}`;
    pages = files.map((f) => ({ src: `${base}/${encodeURIComponent(path.basename(f))}` }));
  } else {
    const { pages: srcPages } = await src.getChapter(slug, ref);
    pages = srcPages.map((p) => ({
      src: proxiedImage(p.url, p.referer, p.descramble),
      width: p.width,
      height: p.height,
    }));
  }

  const progress = await getChapterProgress(source, slug, ref);

  let nextChapterFirstPages: string[] | undefined;
  if (next) {
    try {
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
      const result = await Promise.race([
        src.getChapter(slug, next.ref).then((ch) => ch.pages.slice(0, 3)),
        timeout,
      ]);
      if (result) {
        nextChapterFirstPages = result.map((p) => proxiedImage(p.url, p.referer, p.descramble));
      }
    } catch {
      nextChapterFirstPages = undefined;
    }
  }

  return (
    <Reader
      source={source}
      slug={slug}
      chapterRef={ref}
      chapterNumber={current?.number ?? ""}
      seriesTitle={detail.title}
      pages={pages}
      startPage={progress && !progress.finished ? progress.page : 0}
      startScrollOffset={progress && !progress.finished ? progress.scrollOffset : 0}
      offline={download?.status === "done"}
      isLatest={!next}
      prev={prev ? { ref: prev.ref, number: prev.number } : undefined}
      next={next ? { ref: next.ref, number: next.number } : undefined}
      nextChapterFirstPages={nextChapterFirstPages}
    />
  );
}
