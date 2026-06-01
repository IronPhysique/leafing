"use client";

import { useMemo, useEffect, useState } from "react";
import { SeriesCard } from "@/components/SeriesCard";
import { LibraryToolbar, SortKey, Density, DENSITY_MINMAX, CategoryMeta } from "@/components/LibraryToolbar";
import { resolveDisplayTitle } from "@/lib/metadata/title";

export interface LibraryEntryWithCats {
  id: string;
  sourceId: string;
  slug: string;
  title: string;
  titleEnglish: string | null;
  titleRomaji: string | null;
  coverUrl: string | null;
  coverReferer: string | null;
  addedAt: Date;
  lastReadAt: Date | null;
  unreadCount: number;
  categories: { categoryId: string }[];
}

interface Props {
  entries: LibraryEntryWithCats[];
  allCategories: { id: string; name: string }[];
}

const LS_SORT = "library:sort";
const LS_DENSITY = "library:density";

export function LibraryGrid({ entries, allCategories }: Props) {
  const [sort, setSort] = useState<SortKey>("updated");
  const [density, setDensity] = useState<Density>(2);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedSort = localStorage.getItem(LS_SORT) as SortKey | null;
    const savedDensity = localStorage.getItem(LS_DENSITY);
    if (savedSort) setSort(savedSort);
    if (savedDensity) {
      const d = parseInt(savedDensity, 10) as Density;
      if (d === 1 || d === 2 || d === 3) setDensity(d);
    }
    setHydrated(true);
  }, []);

  function handleSortChange(s: SortKey) {
    setSort(s);
    localStorage.setItem(LS_SORT, s);
  }

  function handleDensityChange(d: Density) {
    setDensity(d);
    localStorage.setItem(LS_DENSITY, String(d));
  }

  const categoryMeta = useMemo<CategoryMeta[]>(() => {
    return allCategories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      count: entries.filter((e) => e.categories.some((c) => c.categoryId === cat.id)).length,
    }));
  }, [allCategories, entries]);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return entries;
    return entries.filter((e) => e.categories.some((c) => c.categoryId === activeCategory));
  }, [entries, activeCategory]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    switch (sort) {
      case "updated":
        return copy.sort((a, b) => {
          const at = a.lastReadAt?.getTime() ?? a.addedAt.getTime();
          const bt = b.lastReadAt?.getTime() ?? b.addedAt.getTime();
          return bt - at;
        });
      case "added":
        return copy.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
      case "title":
        return copy.sort((a, b) => {
          const at = resolveDisplayTitle({ english: a.titleEnglish ?? undefined, romaji: a.titleRomaji ?? undefined }) || a.title;
          const bt = resolveDisplayTitle({ english: b.titleEnglish ?? undefined, romaji: b.titleRomaji ?? undefined }) || b.title;
          return at.localeCompare(bt);
        });
      case "progress":
        return copy.sort((a, b) => {
          const at = a.lastReadAt?.getTime() ?? 0;
          const bt = b.lastReadAt?.getTime() ?? 0;
          return bt - at;
        });
      default:
        return copy;
    }
  }, [filtered, sort]);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <div className="h-16 animate-pulse rounded-lg bg-surface" />
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(8.5rem, 1fr))` }}
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton aspect-[2/3] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <LibraryToolbar
        categories={categoryMeta}
        totalCount={entries.length}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        sort={sort}
        onSortChange={handleSortChange}
        density={density}
        onDensityChange={handleDensityChange}
      />

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface/40 px-6 py-12 text-center">
          <span className="text-2xl">🗂</span>
          <p className="text-sm text-content-dim">No series in this category yet.</p>
          <p className="text-xs text-content-dim">
            Assign series from their detail page using the Categorise button.
          </p>
        </div>
      ) : (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${DENSITY_MINMAX[density]}, 1fr))` }}
        >
          {sorted.map((e) => (
            <SeriesCard
              key={e.id}
              href={`/series/${e.sourceId}/${encodeURIComponent(e.slug)}`}
              title={
                resolveDisplayTitle({
                  english: e.titleEnglish ?? undefined,
                  romaji: e.titleRomaji ?? undefined,
                }) || e.title
              }
              coverUrl={e.coverUrl ?? undefined}
              coverReferer={e.coverReferer ?? undefined}
              badge={sourceBadge(e.sourceId)}
              unreadCount={e.unreadCount > 0 ? e.unreadCount : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function sourceBadge(sourceId: string): string | undefined {
  const map: Record<string, string> = {
    mangadex: "MD",
    flamecomics: "FC",
    comick: "CMK",
    weebcentral: "WC",
    asurascans: "AS",
  };
  return map[sourceId];
}
