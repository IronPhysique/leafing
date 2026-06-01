import { describe, it, expect } from "vitest";
import { nextResume, shouldPersist } from "./resume";
import type { ProgressRow } from "./resume";

describe("nextResume", () => {
  it("returns null for an empty array", () => {
    expect(nextResume([])).toBeNull();
  });

  it("returns null when all rows are finished", () => {
    const rows: ProgressRow[] = [
      { chapterRef: "ch-1", page: 5, scrollOffset: 100, finished: true, updatedAt: 1000 },
      { chapterRef: "ch-2", page: 10, scrollOffset: 200, finished: true, updatedAt: 2000 },
    ];
    expect(nextResume(rows)).toBeNull();
  });

  it("picks the single unfinished row", () => {
    const rows: ProgressRow[] = [
      { chapterRef: "ch-1", page: 3, scrollOffset: 60, finished: false, updatedAt: 1000 },
    ];
    const result = nextResume(rows);
    expect(result).toEqual({ chapterRef: "ch-1", page: 3, scrollOffset: 60 });
  });

  it("picks the unfinished row with the greatest updatedAt", () => {
    const rows: ProgressRow[] = [
      { chapterRef: "ch-1", page: 1, scrollOffset: 10, finished: false, updatedAt: 1000 },
      { chapterRef: "ch-2", page: 5, scrollOffset: 80, finished: false, updatedAt: 3000 },
      { chapterRef: "ch-3", page: 2, scrollOffset: 40, finished: false, updatedAt: 2000 },
    ];
    const result = nextResume(rows);
    expect(result).toEqual({ chapterRef: "ch-2", page: 5, scrollOffset: 80 });
  });

  it("ignores finished rows and picks latest unfinished", () => {
    const rows: ProgressRow[] = [
      { chapterRef: "ch-1", page: 8, scrollOffset: 150, finished: true, updatedAt: 9999 },
      { chapterRef: "ch-2", page: 3, scrollOffset: 50, finished: false, updatedAt: 500 },
      { chapterRef: "ch-3", page: 7, scrollOffset: 120, finished: false, updatedAt: 800 },
    ];
    const result = nextResume(rows);
    // ch-1 is finished (even though it has the highest updatedAt), so we expect ch-3
    expect(result).toEqual({ chapterRef: "ch-3", page: 7, scrollOffset: 120 });
  });

  it("returns null when the only finished row has highest updatedAt and rest are also finished", () => {
    const rows: ProgressRow[] = [
      { chapterRef: "ch-1", page: 5, scrollOffset: 100, finished: true, updatedAt: 5000 },
    ];
    expect(nextResume(rows)).toBeNull();
  });
});

describe("shouldPersist", () => {
  const base = {
    prevChapterRef: "ch-1",
    nextChapterRef: "ch-1",
    isClose: false,
    now: 1000,
    lastSavedAt: 1000,
  };

  it("returns false when none of the conditions are met (delta = 0)", () => {
    expect(shouldPersist(base)).toBe(false);
  });

  it("returns false when delta is 499ms (below debounce threshold)", () => {
    expect(shouldPersist({ ...base, now: 1499, lastSavedAt: 1000 })).toBe(false);
  });

  it("returns true when delta is exactly 500ms (at debounce threshold)", () => {
    expect(shouldPersist({ ...base, now: 1500, lastSavedAt: 1000 })).toBe(true);
  });

  it("returns true when delta is greater than 500ms", () => {
    expect(shouldPersist({ ...base, now: 2000, lastSavedAt: 1000 })).toBe(true);
  });

  it("returns true when chapter changed (prevChapterRef !== nextChapterRef)", () => {
    expect(
      shouldPersist({ ...base, prevChapterRef: "ch-1", nextChapterRef: "ch-2", now: 1000, lastSavedAt: 1000 })
    ).toBe(true);
  });

  it("returns true when isClose is true regardless of time delta", () => {
    expect(shouldPersist({ ...base, isClose: true, now: 1000, lastSavedAt: 1000 })).toBe(true);
  });

  it("returns true when isClose is true even with delta < 500", () => {
    expect(shouldPersist({ ...base, isClose: true, now: 1100, lastSavedAt: 1000 })).toBe(true);
  });

  it("returns true when chapter changed even with delta < 500", () => {
    expect(
      shouldPersist({ ...base, prevChapterRef: "ch-1", nextChapterRef: "ch-2", now: 1001, lastSavedAt: 1000 })
    ).toBe(true);
  });
});
