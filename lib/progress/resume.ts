export type ProgressRow = {
  chapterRef: string;
  page: number;
  scrollOffset: number;
  finished: boolean;
  updatedAt: number;
};

export type ResumePoint = {
  chapterRef: string;
  page: number;
  scrollOffset: number;
};

export function nextResume(rows: ProgressRow[]): ResumePoint | null {
  let best: ProgressRow | null = null;

  for (const row of rows) {
    if (row.finished) continue;
    if (best === null || row.updatedAt > best.updatedAt) {
      best = row;
    }
  }

  if (best === null) return null;

  return {
    chapterRef: best.chapterRef,
    page: best.page,
    scrollOffset: best.scrollOffset,
  };
}

export type ShouldPersistArgs = {
  prevChapterRef: string;
  nextChapterRef: string;
  isClose: boolean;
  now: number;
  lastSavedAt: number;
};

export function shouldPersist({
  prevChapterRef,
  nextChapterRef,
  isClose,
  now,
  lastSavedAt,
}: ShouldPersistArgs): boolean {
  if (prevChapterRef !== nextChapterRef) return true;
  if (isClose) return true;
  if (now - lastSavedAt >= 500) return true;
  return false;
}
