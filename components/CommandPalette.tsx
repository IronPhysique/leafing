"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { proxiedImage } from "@/lib/proxy";
import type { SearchResult, SearchResponse } from "@/app/api/search/route";

const GO_TO_LINKS = [
  { label: "Home", href: "/" },
  { label: "Library", href: "/library" },
  { label: "Updates", href: "/updates" },
  { label: "Browse", href: "/search" },
  { label: "Settings", href: "/settings" },
];

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [library, setLibrary] = useState<SearchResult[]>([]);
  const [sources, setSources] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 280);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      if (e.key === "/") {
        const tag = (e.target as HTMLElement).tagName;
        const isEditable =
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          (e.target as HTMLElement).isContentEditable;
        if (isEditable) return;
        e.preventDefault();
        setOpen(true);
      }
    }
    function onOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("manhwa:open-palette", onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("manhwa:open-palette", onOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setLibrary([]);
      setSources([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data: SearchResponse) => {
        if (cancelled) return;
        const lib = data.library ?? [];
        const libKeys = new Set(lib.map((r) => `${r.sourceId}:${r.slug}`));
        setLibrary(lib);
        setSources((data.sources ?? []).filter((r) => !libKeys.has(`${r.sourceId}:${r.slug}`)));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router],
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setQuery("");
      setLibrary([]);
      setSources([]);
    }
  }

  if (!open) return null;

  const q = query.trim();
  const searchAllHref = `/search?source=all&q=${encodeURIComponent(q)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      onClick={() => handleOpenChange(false)}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden />

      <Command
        label="Command palette"
        shouldFilter={false}
        className="relative w-full max-w-xl rounded-2xl border border-border-strong bg-surface shadow-[0_8px_40px_rgba(0,0,0,0.7)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className="flex-shrink-0 text-content-dim"
          >
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>

          <Command.Input
            ref={inputRef}
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Search manhwa, your library, or jump to…"
            className="flex-1 bg-transparent text-sm text-content placeholder:text-content-faint outline-none"
          />

          {loading && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
              className="flex-shrink-0 animate-spin text-content-faint"
            >
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
              <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}

          <kbd className="hidden sm:inline-flex items-center justify-center rounded border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-content-faint">
            Esc
          </kbd>
        </div>

        <Command.List className="max-h-[min(60vh,26rem)] overflow-y-auto py-2">
          <Command.Empty className="py-10 text-center text-sm text-content-faint">
            {q ? "No results." : "Search manhwa, your library, or jump to a page."}
          </Command.Empty>

          {library.length > 0 && (
            <Command.Group
              heading="Library"
              className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-content-faint"
            >
              {library.map((r) => (
                <ResultItem key={`lib:${r.sourceId}:${r.slug}`} r={r} go={go} />
              ))}
            </Command.Group>
          )}

          {sources.length > 0 && (
            <Command.Group
              heading="Manga"
              className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-content-faint"
            >
              {sources.map((r) => (
                <ResultItem key={`src:${r.sourceId}:${r.slug}`} r={r} go={go} />
              ))}
            </Command.Group>
          )}

          <Command.Group
            heading="Go to"
            className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-content-faint"
          >
            {GO_TO_LINKS.map((link) => (
              <Command.Item
                key={link.href}
                value={`goto:${link.label}`}
                onSelect={() => go(link.href)}
                className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-content
                           data-[selected=true]:bg-accent/15 data-[selected=true]:text-content
                           hover:bg-surface-2 transition-colors"
              >
                <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-surface-2 ring-1 ring-border text-xs text-content-dim">
                  {NAV_ICON[link.label] ?? "→"}
                </span>
                <span>{link.label}</span>
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Group className="border-t border-border mt-1 pt-1">
            <Command.Item
              value="search-all-sources"
              onSelect={() => go(searchAllHref)}
              className="flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm text-content
                         data-[selected=true]:bg-accent/15 data-[selected=true]:text-content
                         hover:bg-surface-2 transition-colors"
            >
              <span className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-surface-2 ring-1 ring-border text-xs">
                🔍
              </span>
              <span>
                {q ? (
                  <>
                    Search all sources for{" "}
                    <span className="font-semibold text-accent">
                      &ldquo;{q}&rdquo;
                    </span>
                  </>
                ) : (
                  "Browse all sources"
                )}
              </span>
            </Command.Item>
          </Command.Group>
        </Command.List>

        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[11px] text-content-faint">
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center rounded border border-border bg-surface-2 px-1 font-mono text-[10px]">↑</kbd>
            <kbd className="inline-flex items-center justify-center rounded border border-border bg-surface-2 px-1 font-mono text-[10px]">↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex items-center justify-center rounded border border-border bg-surface-2 px-1 font-mono text-[10px]">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1 ml-auto">
            <kbd className="inline-flex items-center justify-center rounded border border-border bg-surface-2 px-1 font-mono text-[10px]">Esc</kbd>
            close
          </span>
        </div>
      </Command>
    </div>
  );
}

function ResultItem({ r, go }: { r: SearchResult; go: (href: string) => void }) {
  const href = `/series/${r.sourceId}/${encodeURIComponent(r.slug)}`;
  const thumb = r.coverUrl ? proxiedImage(r.coverUrl, r.coverReferer) : null;
  return (
    <Command.Item
      value={`${r.sourceId}:${r.slug}:${r.title}`}
      onSelect={() => go(href)}
      className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm text-content
                 data-[selected=true]:bg-accent/15 data-[selected=true]:text-content
                 hover:bg-surface-2 transition-colors"
    >
      <div className="relative aspect-[2/3] w-6 flex-shrink-0 overflow-hidden rounded bg-surface-2 ring-1 ring-border">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover object-center" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-[8px] text-content-dim">📖</div>
        )}
      </div>
      <span className="flex-1 truncate">{r.title}</span>
      <span className="text-[10px] uppercase tracking-wide text-content-faint">{r.sourceId}</span>
    </Command.Item>
  );
}

const NAV_ICON: Record<string, string> = {
  Home: "🏠",
  Library: "📚",
  Updates: "🔔",
  Browse: "🔍",
  Settings: "⚙️",
};
