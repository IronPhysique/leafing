"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SourceFilters, SourceSort, SourceStatus, SourceContentRating } from "@/lib/sources/types";

type SourceMeta = { id: string; name: string; filters: SourceFilters };

const ALL_ID = "all";

const SORT_LABELS: Record<string, string> = {
  relevance: "Relevance",
  popularity: "Popularity",
  latest: "Latest",
  alphabetical: "A–Z",
};
const STATUS_LABELS: Record<string, string> = {
  any: "Any status",
  ongoing: "Ongoing",
  completed: "Completed",
  hiatus: "Hiatus",
  cancelled: "Cancelled",
};

export function SearchControls({
  sources,
  activeId,
  q,
  sort,
  status,
  selectedCr,
}: {
  sources: SourceMeta[];
  activeId: string;
  q: string;
  sort: string;
  status: string;
  selectedCr: SourceContentRating[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const active = activeId === ALL_ID ? null : (sources.find((s) => s.id === activeId) ?? sources[0]);
  const [query, setQuery] = useState(q);

  function navigate(next: {
    source?: string;
    sort?: string;
    status?: string;
    cr?: SourceContentRating[];
    q?: string;
    resetFilters?: boolean;
  }) {
    const sp = new URLSearchParams();
    const srcId = next.source ?? activeId;
    sp.set("source", srcId);
    const qv = next.q ?? query;
    if (qv.trim()) sp.set("q", qv.trim());
    if (!next.resetFilters) {
      const sv = next.sort ?? sort;
      const stv = next.status ?? status;
      const crv = next.cr ?? selectedCr;
      if (sv) sp.set("sort", sv);
      if (stv && stv !== "any") sp.set("status", stv);
      crv.forEach((c) => sp.append("cr", c));
    }
    startTransition(() => router.push(`/search?${sp.toString()}`));
  }

  const chip =
    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition";
  const chipOn = "border-accent/50 bg-accent/15 text-content";
  const chipOff = "border-border bg-surface text-content-dim hover:border-border-strong hover:text-content";

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ q: query });
        }}
        aria-busy={isPending}
        className={"flex flex-wrap gap-2 transition-opacity " + (isPending ? "opacity-60" : "")}
      >
        <div className="flex flex-none items-center gap-1 rounded-lg border border-border bg-surface p-1">
          <button
            key={ALL_ID}
            type="button"
            data-testid="source-chip-all"
            aria-pressed={activeId === ALL_ID}
            onClick={() => navigate({ source: ALL_ID, resetFilters: true })}
            className={
              "rounded-md px-3 py-1.5 text-sm font-medium transition " +
              (activeId === ALL_ID ? "bg-accent text-white" : "text-content-dim hover:text-content")
            }
          >
            All
          </button>
          {sources.map((s) => (
            <button
              key={s.id}
              type="button"
              data-testid={`source-chip-${s.id}`}
              aria-pressed={s.id === activeId}
              onClick={() => navigate({ source: s.id, resetFilters: true })}
              className={
                "rounded-md px-3 py-1.5 text-sm font-medium transition " +
                (s.id === activeId ? "bg-accent text-white" : "text-content-dim hover:text-content")
              }
            >
              {s.name}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles…"
          className="min-w-[200px] flex-1 rounded-md border border-border bg-surface px-3 py-1.5 text-sm outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg"
        />
        <button className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-hover">
          Search
        </button>
      </form>

      {active && (
        <div className="flex flex-wrap items-center gap-3">
          {active.filters.sorts.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs uppercase tracking-wide text-content-dim">Sort</span>
              {active.filters.sorts.map((s: SourceSort) => (
                <button
                  key={s}
                  onClick={() => navigate({ sort: s })}
                  className={`${chip} ${sort === s ? chipOn : chipOff}`}
                >
                  {SORT_LABELS[s] ?? s}
                </button>
              ))}
            </div>
          )}

          {active.filters.statuses.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs uppercase tracking-wide text-content-dim">Status</span>
              {active.filters.statuses.map((s: SourceStatus) => {
                const on = status === s || (s === "any" && !status);
                return (
                  <button
                    key={s}
                    onClick={() => navigate({ status: s })}
                    className={`${chip} ${on ? chipOn : chipOff}`}
                  >
                    {STATUS_LABELS[s] ?? s}
                  </button>
                );
              })}
            </div>
          )}

          {active.filters.contentRatings.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs uppercase tracking-wide text-content-dim">Rating</span>
              {active.filters.contentRatings.map((cr: SourceContentRating) => {
                const on = selectedCr.includes(cr);
                return (
                  <button
                    key={cr}
                    onClick={() =>
                      navigate({ cr: on ? selectedCr.filter((c) => c !== cr) : [...selectedCr, cr] })
                    }
                    className={`${chip} capitalize ${on ? chipOn : chipOff}`}
                  >
                    {cr}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
