"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { setProgress, clearUnread } from "@/lib/library";
import { shouldPersist } from "@/lib/progress/resume";
import { profileKey } from "@/lib/theme";

type Neighbor = { ref: string; number: string };
type Mode = "strip" | "paged";
type Fit = "width" | "height" | "screen" | "original";
type Page = { src: string; width?: number; height?: number };

const FIT_KEY = "reader.fit";
const modeKey = (s: string, slug: string) => profileKey(`reader.mode.${s}.${slug}`);
const DEFAULT_MODE_KEY = "reader.defaultMode";
const BRIGHTNESS_KEY = "reader.brightness";
const SEPIA_KEY = "reader.sepia";

const FIT_LABEL: Record<Fit, string> = {
  width: "Fit width",
  height: "Fit height",
  screen: "Fit screen",
  original: "Original",
};
const FIT_CYCLE: Fit[] = ["width", "height", "screen", "original"];

const STRIP_PRELOAD_TRIGGER = 3;
const PAGED_PRELOAD_AHEAD = 3;

function imgClass(fit: Fit): string {
  switch (fit) {
    case "width":
      return "w-full max-w-3xl";
    case "height":
      return "h-screen w-auto max-w-none";
    case "screen":
      return "max-h-screen w-auto max-w-full";
    case "original":
      return "w-auto max-w-none";
  }
}

export function Reader({
  source,
  slug,
  chapterRef,
  chapterNumber,
  seriesTitle,
  pages,
  startPage,
  startScrollOffset = 0,
  offline,
  isLatest = false,
  prev,
  next,
  nextChapterFirstPages,
}: {
  source: string;
  slug: string;
  chapterRef: string;
  chapterNumber: string;
  seriesTitle: string;
  pages: Page[];
  startPage: number;
  startScrollOffset?: number;
  offline: boolean;
  isLatest?: boolean;
  prev?: Neighbor;
  next?: Neighbor;
  nextChapterFirstPages?: string[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("strip");
  const [fit, setFit] = useState<Fit>("width");
  const [currentPage, setCurrentPage] = useState(startPage);
  const [brightness, setBrightness] = useState(0);
  const [sepia, setSepia] = useState(false);
  const [showAppearance, setShowAppearance] = useState(false);
  const pageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const lastSaved = useRef(startPage);
  const lastSavedAt = useRef(0);
  const scrollOffsetRef = useRef(startScrollOffset);

  const seriesHref = `/series/${source}/${encodeURIComponent(slug)}`;
  const total = pages.length;
  const nextHref = next
    ? `/read/${source}/${encodeURIComponent(slug)}/${encodeURIComponent(next.ref)}`
    : null;
  const prevHref = prev
    ? `/read/${source}/${encodeURIComponent(slug)}/${encodeURIComponent(prev.ref)}`
    : null;

  useEffect(() => {
    const f = localStorage.getItem(profileKey(FIT_KEY)) as Fit | null;
    if (f && FIT_CYCLE.includes(f)) setFit(f);
    const m = localStorage.getItem(modeKey(source, slug)) as Mode | null;
    const dm = localStorage.getItem(profileKey(DEFAULT_MODE_KEY)) as Mode | null;
    const resolvedMode = (m === "strip" || m === "paged") ? m : (dm === "strip" || dm === "paged") ? dm : null;
    if (resolvedMode) setMode(resolvedMode);
    const b = Number(localStorage.getItem(profileKey(BRIGHTNESS_KEY)) ?? "0");
    if (!isNaN(b) && b >= 0 && b <= 60) setBrightness(b);
    const sep = localStorage.getItem(profileKey(SEPIA_KEY));
    if (sep === "1") setSepia(true);
  }, [source, slug]);

  useEffect(() => {
    if (isLatest) void clearUnread(source, slug);
  }, [isLatest, source, slug]);

  useEffect(() => {
    localStorage.setItem(profileKey(FIT_KEY), fit);
  }, [fit]);
  useEffect(() => {
    localStorage.setItem(modeKey(source, slug), mode);
  }, [mode, source, slug]);
  useEffect(() => {
    localStorage.setItem(profileKey(BRIGHTNESS_KEY), String(brightness));
  }, [brightness]);
  useEffect(() => {
    localStorage.setItem(profileKey(SEPIA_KEY), sepia ? "1" : "0");
  }, [sepia]);

  useEffect(() => {
    if (mode !== "paged") return;
    for (let i = 1; i <= PAGED_PRELOAD_AHEAD; i++) {
      const idx = currentPage + i;
      if (idx < total) {
        const img = new Image();
        img.src = pages[idx].src;
      }
    }
  }, [mode, currentPage, pages, total]);

  useEffect(() => {
    if (mode !== "strip") return;
    if (!nextChapterFirstPages || nextChapterFirstPages.length === 0) return;
    const pagesFromEnd = total - 1 - currentPage;
    if (pagesFromEnd <= STRIP_PRELOAD_TRIGGER) {
      nextChapterFirstPages.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    }
  }, [mode, currentPage, total, nextChapterFirstPages]);

  const persist = useCallback(
    (page: number, scrollOffset: number, finished: boolean) => {
      void setProgress({
        sourceId: source,
        slug,
        chapterRef,
        chapterNumber,
        page,
        scrollOffset,
        finished,
        isLatestChapter: isLatest,
      });
    },
    [source, slug, chapterRef, chapterNumber, isLatest],
  );

  useEffect(() => {
    if (currentPage !== lastSaved.current) {
      lastSaved.current = currentPage;
      persist(currentPage, scrollOffsetRef.current, currentPage >= total - 1);
    }
  }, [currentPage, total, persist]);

  useEffect(() => {
    if (mode !== "strip") return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setCurrentPage(Number((e.target as HTMLElement).dataset.idx));
        }
      },
      { threshold: 0.5 },
    );
    pageRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [mode, total]);

  useEffect(() => {
    if (mode !== "strip") return;

    function onScroll() {
      const offset = Math.round(window.scrollY);
      scrollOffsetRef.current = offset;

      const now = Date.now();
      if (
        shouldPersist({
          prevChapterRef: chapterRef,
          nextChapterRef: chapterRef,
          isClose: false,
          now,
          lastSavedAt: lastSavedAt.current,
        })
      ) {
        lastSavedAt.current = now;
        persist(lastSaved.current, offset, lastSaved.current >= total - 1);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mode, chapterRef, persist, total]);

  useEffect(() => {
    if (mode === "strip") {
      if (startPage > 0) {
        pageRefs.current[startPage]?.scrollIntoView({ block: "start" });
      }
      if (startScrollOffset > 0) {
        window.scrollTo({ top: startScrollOffset });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    return () => {
      persist(lastSaved.current, scrollOffsetRef.current, lastSaved.current >= total - 1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goPage = useCallback(
    (delta: number) => {
      setCurrentPage((p) => {
        const nextP = p + delta;
        if (nextP < 0) {
          if (prevHref) router.push(prevHref);
          return p;
        }
        if (nextP >= total) {
          if (nextHref) router.push(nextHref);
          return p;
        }
        if (mode === "paged") window.scrollTo({ top: 0 });
        else pageRefs.current[nextP]?.scrollIntoView({ block: "start" });
        return nextP;
      });
    },
    [total, mode, nextHref, prevHref, router],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      switch (e.key) {
        case "ArrowRight":
        case "d":
          if (mode === "paged") { e.preventDefault(); goPage(1); }
          break;
        case "ArrowLeft":
        case "a":
          if (mode === "paged") { e.preventDefault(); goPage(-1); }
          break;
        case " ":
          if (mode === "paged") { e.preventDefault(); goPage(1); }
          break;
        case "f":
          setFit((cur) => FIT_CYCLE[(FIT_CYCLE.indexOf(cur) + 1) % FIT_CYCLE.length]);
          break;
        case "m":
          setMode((cur) => (cur === "strip" ? "paged" : "strip"));
          break;
        case "[":
          if (prevHref) router.push(prevHref);
          break;
        case "]":
          if (nextHref) router.push(nextHref);
          break;
        case "Escape":
          router.push(seriesHref);
          break;
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, goPage, nextHref, prevHref, seriesHref, router]);

  const pct = total > 0 ? ((currentPage + 1) / total) * 100 : 0;

  const pageFilter = sepia ? "sepia(0.5) saturate(0.9)" : undefined;

  function applyOledDim() {
    setBrightness(40);
    setSepia(true);
  }

  return (
    <div className="relative -mx-6 -my-6 min-h-screen bg-ink">
      <div className="fixed inset-x-0 top-0 z-30 h-0.5 bg-white/10">
        <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
      </div>

      {brightness > 0 && (
        <div
          aria-hidden
          className="fixed inset-0 z-10 bg-black pointer-events-none"
          style={{ opacity: brightness / 100 }}
        />
      )}

      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-bg/90 px-4 py-2 text-sm backdrop-blur">
        <Link href={seriesHref} className="truncate text-content-dim hover:text-content">
          ← {seriesTitle}
        </Link>
        <div className="flex flex-none items-center gap-2">
          {offline && (
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-300">offline</span>
          )}
          <span className="text-content-dim">
            Ch. {chapterNumber} · {currentPage + 1}/{total}
          </span>
          <button
            onClick={() => setMode((m) => (m === "strip" ? "paged" : "strip"))}
            className="rounded bg-surface-2 px-2 py-1 text-xs hover:bg-surface-3"
            title="Toggle reading mode (m)"
          >
            {mode === "strip" ? "Strip" : "Paged"}
          </button>
          <button
            onClick={() => setFit((cur) => FIT_CYCLE[(FIT_CYCLE.indexOf(cur) + 1) % FIT_CYCLE.length])}
            className="rounded bg-surface-2 px-2 py-1 text-xs hover:bg-surface-3"
            title="Cycle fit (f)"
          >
            {FIT_LABEL[fit]}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowAppearance((v) => !v)}
              className={
                "rounded px-2 py-1 text-xs " +
                (showAppearance || brightness > 0 || sepia
                  ? "bg-accent/20 text-accent hover:bg-accent/30"
                  : "bg-surface-2 hover:bg-surface-3")
              }
              title="Appearance"
              aria-expanded={showAppearance}
            >
              ☀
            </button>
            {showAppearance && (
              <AppearancePanel
                brightness={brightness}
                sepia={sepia}
                onBrightness={setBrightness}
                onSepia={setSepia}
                onOledDim={applyOledDim}
                onReset={() => { setBrightness(0); setSepia(false); }}
                onClose={() => setShowAppearance(false)}
              />
            )}
          </div>
        </div>
      </div>

      {mode === "strip" ? (
        <div className="flex flex-col items-center" style={{ filter: pageFilter }}>
          {pages.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              ref={(el) => {
                pageRefs.current[i] = el;
              }}
              data-idx={i}
              src={p.src}
              alt={`Page ${i + 1}`}
              width={p.width}
              height={p.height}
              loading={i < 3 ? "eager" : "lazy"}
              decoding="async"
              className={imgClass(fit)}
            />
          ))}
          <EndCard next={next} nextHref={nextHref} seriesHref={seriesHref} />
        </div>
      ) : (
        <div style={{ filter: pageFilter }}>
          <PagedView
            pages={pages}
            index={currentPage}
            fit={fit}
            onZone={(z) => {
              if (z === "prev") goPage(-1);
              else if (z === "next") goPage(1);
            }}
          />
        </div>
      )}

      {mode === "strip" && (
        <div className="flex items-center justify-between gap-3 border-t border-border bg-bg px-4 py-4">
          {prevHref ? (
            <Link href={prevHref} className="rounded-md bg-surface-2 px-4 py-2 text-sm hover:bg-surface-3">
              ← Ch. {prev!.number}
            </Link>
          ) : (
            <span />
          )}
          <Link href={seriesHref} className="text-sm text-content-dim hover:text-content">
            All chapters
          </Link>
          {nextHref ? (
            <Link href={nextHref} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover">
              Ch. {next!.number} →
            </Link>
          ) : (
            <span className="text-sm text-content-faint">Up to date</span>
          )}
        </div>
      )}
    </div>
  );
}

function AppearancePanel({
  brightness,
  sepia,
  onBrightness,
  onSepia,
  onOledDim,
  onReset,
  onClose,
}: {
  brightness: number;
  sepia: boolean;
  onBrightness: (v: number) => void;
  onSepia: (v: boolean) => void;
  onOledDim: () => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-border bg-surface p-3 shadow-card"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="mb-2 text-xs font-medium text-content-dim">Appearance</p>

      <label className="mb-1 flex items-center justify-between text-xs text-content-dim">
        <span>Brightness dim</span>
        <span className="tabular-nums">{brightness}%</span>
      </label>
      <input
        type="range"
        min={0}
        max={60}
        step={5}
        value={brightness}
        onChange={(e) => onBrightness(Number(e.target.value))}
        className="mb-3 w-full accent-accent"
        aria-label="Brightness dim level"
      />

      <label className="mb-3 flex cursor-pointer items-center justify-between text-xs text-content-dim">
        <span>Warmth (sepia)</span>
        <span
          role="switch"
          aria-checked={sepia}
          tabIndex={0}
          onClick={() => onSepia(!sepia)}
          onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onSepia(!sepia); } }}
          className={
            "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
            (sepia ? "bg-accent" : "bg-surface-3")
          }
        >
          <span
            className={
              "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform " +
              (sepia ? "translate-x-4" : "translate-x-0")
            }
          />
        </span>
      </label>

      <div className="flex gap-2">
        <button
          onClick={onOledDim}
          className="flex-1 rounded bg-surface-2 px-2 py-1 text-xs hover:bg-surface-3"
          title="Dim + warm — easy on OLED screens"
        >
          OLED dim
        </button>
        <button
          onClick={onReset}
          className="flex-1 rounded bg-surface-2 px-2 py-1 text-xs hover:bg-surface-3 text-content-dim"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function EndCard({
  next,
  nextHref,
  seriesHref,
}: {
  next?: Neighbor;
  nextHref: string | null;
  seriesHref: string;
}) {
  return (
    <div className="my-10 flex w-full max-w-3xl flex-col items-center gap-4 rounded-xl border border-border bg-surface px-6 py-10 text-center">
      <p className="text-xs font-medium uppercase tracking-widest text-content-faint">
        End of chapter
      </p>

      {nextHref ? (
        <>
          <Link
            href={nextHref}
            className="mt-1 rounded-lg bg-accent px-8 py-3 text-lg font-semibold text-white hover:bg-accent-hover"
          >
            Next: Ch {next!.number} →
          </Link>
          <Link
            href={seriesHref}
            className="text-sm text-content-dim hover:text-content"
          >
            ← Back to series
          </Link>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center gap-2">
            <span className="text-3xl" aria-hidden>✓</span>
            <p className="text-base font-medium text-content">You&apos;re all caught up!</p>
            <p className="text-sm text-content-dim">No new chapters available yet.</p>
          </div>
          <Link
            href={seriesHref}
            className="mt-1 rounded-lg bg-surface-2 px-6 py-2.5 text-sm font-medium hover:bg-surface-3"
          >
            ← Back to series
          </Link>
        </>
      )}
    </div>
  );
}

function PagedView({
  pages,
  index,
  fit,
  onZone,
}: {
  pages: Page[];
  index: number;
  fit: Fit;
  onZone: (zone: "prev" | "next") => void;
}) {
  const p = pages[index];
  return (
    <div className="relative flex min-h-[calc(100vh-3rem)] items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={p.src}
        alt={`Page ${index + 1}`}
        width={p.width}
        height={p.height}
        decoding="async"
        className={imgClass(fit)}
      />
      <button
        aria-label="Previous page"
        className="absolute inset-y-0 left-0 w-1/2 cursor-w-resize"
        onClick={() => onZone("prev")}
      />
      <button
        aria-label="Next page"
        className="absolute inset-y-0 right-0 w-1/2 cursor-e-resize"
        onClick={() => onZone("next")}
      />
    </div>
  );
}
