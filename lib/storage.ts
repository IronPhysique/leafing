import path from "node:path";
import fs from "node:fs/promises";

export const STORAGE_ROOT = process.env.MANGA_STORAGE_DIR ?? "/data/manga";

export function chapterDir(sourceId: string, slug: string, chapterRef: string): string {
  return path.join(STORAGE_ROOT, safe(sourceId), safe(slug), safe(chapterRef));
}

export function safe(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function resolveLocal(relPath: string): string | null {
  const full = path.normalize(path.join(STORAGE_ROOT, relPath));
  if (!full.startsWith(path.normalize(STORAGE_ROOT + path.sep))) return null;
  return full;
}

export async function listChapterFiles(dir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(dir);
    return files
      .filter((f) => /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(f))
      .sort((a, b) => {
        const na = parseInt(a, 10);
        const nb = parseInt(b, 10);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b);
      });
  } catch {
    return [];
  }
}
