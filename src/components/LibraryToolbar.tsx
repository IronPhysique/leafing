"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { createCategory, renameCategory, deleteCategory } from "@/lib/library";

export type SortKey = "updated" | "title" | "progress" | "added";
export type Density = 1 | 2 | 3;

export const DENSITY_MINMAX: Record<Density, string> = {
  1: "7rem",
  2: "8.5rem",
  3: "11rem",
};

export interface CategoryMeta {
  id: string;
  name: string;
  count: number;
}

interface Props {
  categories: CategoryMeta[];
  totalCount: number;
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  density: Density;
  onDensityChange: (d: Density) => void;
}

export function LibraryToolbar({
  categories,
  totalCount,
  activeCategory,
  onCategoryChange,
  sort,
  onSortChange,
  density,
  onDensityChange,
}: Props) {
  const [showNewInput, setShowNewInput] = useState(false);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNewInput) inputRef.current?.focus();
  }, [showNewInput]);

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        await createCategory(name);
        toast.success(`Category "${name}" created`);
        setNewName("");
        setShowNewInput(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create category");
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TabButton
          active={activeCategory === "all"}
          onClick={() => onCategoryChange("all")}
          label="All"
          count={totalCount}
        />
        {categories.map((cat) => (
          <CategoryTab
            key={cat.id}
            cat={cat}
            active={activeCategory === cat.id}
            onSelect={() => onCategoryChange(cat.id)}
          />
        ))}

        {!showNewInput && (
          <button
            onClick={() => setShowNewInput(true)}
            className="flex-none rounded-lg border border-dashed border-border px-3 py-1 text-xs text-content-faint hover:border-border-strong hover:text-content-dim transition"
            title="New category"
          >
            + New
          </button>
        )}
        {showNewInput && (
          <form onSubmit={handleCreateSubmit} className="flex items-center gap-1 flex-none">
            <input
              ref={inputRef}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name"
              className="h-7 rounded-lg bg-surface-2 px-2 text-xs ring-1 ring-border focus:outline-none focus:ring-accent w-32"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setShowNewInput(false);
                  setNewName("");
                }
              }}
            />
            <button
              type="submit"
              disabled={pending || !newName.trim()}
              className="h-7 rounded-lg bg-accent px-2 text-xs text-white disabled:opacity-40 hover:bg-accent-hover transition"
            >
              {pending ? "…" : "Add"}
            </button>
            <button
              type="button"
              onClick={() => { setShowNewInput(false); setNewName(""); }}
              className="h-7 rounded-lg bg-surface-2 px-2 text-xs text-content-dim hover:bg-surface-3 transition"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-content-faint">Sort</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className="h-7 rounded-lg bg-surface-2 px-2 text-xs ring-1 ring-border focus:outline-none focus:ring-accent cursor-pointer"
          >
            <option value="updated">Updated</option>
            <option value="added">Added</option>
            <option value="title">Title</option>
            <option value="progress">Progress</option>
          </select>
        </div>

        <div className="flex items-center gap-1" aria-label="Grid density">
          {([1, 2, 3] as Density[]).map((d) => (
            <button
              key={d}
              onClick={() => onDensityChange(d)}
              title={d === 1 ? "Compact" : d === 2 ? "Normal" : "Large"}
              className={[
                "flex h-7 w-7 items-center justify-center rounded-lg transition",
                density === d
                  ? "bg-accent/20 text-accent ring-1 ring-accent/40"
                  : "bg-surface-2 text-content-dim hover:bg-surface-3",
              ].join(" ")}
              aria-pressed={density === d}
            >
              <DensityIcon level={d} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex-none rounded-lg px-3 py-1 text-xs font-medium transition",
        active
          ? "bg-accent/20 text-accent ring-1 ring-accent/40"
          : "bg-surface-2 text-content-dim hover:bg-surface-3",
      ].join(" ")}
    >
      {label}
      <span
        className={[
          "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]",
          active ? "bg-accent/30 text-accent" : "bg-surface-3 text-content-faint",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

function CategoryTab({
  cat,
  active,
  onSelect,
}: {
  cat: CategoryMeta;
  active: boolean;
  onSelect: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(cat.name);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  useEffect(() => {
    if (renaming) renameRef.current?.focus();
  }, [renaming]);

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name || name === cat.name) { setRenaming(false); return; }
    startTransition(async () => {
      try {
        await renameCategory(cat.id, name);
        toast.success("Category renamed");
        setRenaming(false);
        setShowMenu(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to rename");
      }
    });
  }

  function handleDelete() {
    setShowMenu(false);
    startTransition(async () => {
      try {
        await deleteCategory(cat.id);
        toast.success(`"${cat.name}" deleted`);
      } catch {
        toast.error("Failed to delete category");
      }
    });
  }

  if (renaming) {
    return (
      <form onSubmit={handleRename} className="flex items-center gap-1 flex-none">
        <input
          ref={renameRef}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="h-7 rounded-lg bg-surface-2 px-2 text-xs ring-1 ring-accent focus:outline-none w-28"
          onKeyDown={(e) => { if (e.key === "Escape") { setRenaming(false); setNewName(cat.name); }}}
        />
        <button
          type="submit"
          disabled={pending}
          className="h-7 rounded-lg bg-accent px-2 text-xs text-white disabled:opacity-40"
        >
          {pending ? "…" : "OK"}
        </button>
      </form>
    );
  }

  return (
    <div className="relative flex-none" ref={menuRef}>
      <div
        className={[
          "flex items-center rounded-lg text-xs font-medium transition",
          active
            ? "bg-accent/20 text-accent ring-1 ring-accent/40"
            : "bg-surface-2 text-content-dim hover:bg-surface-3",
        ].join(" ")}
      >
        <button onClick={onSelect} className="px-3 py-1">
          {cat.name}
          <span
            className={[
              "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]",
              active ? "bg-accent/30 text-accent" : "bg-surface-3 text-content-faint",
            ].join(" ")}
          >
            {cat.count}
          </span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu((s) => !s); }}
          className="px-1.5 py-1 opacity-50 hover:opacity-100 transition"
          title="Category options"
          aria-haspopup="true"
        >
          ···
        </button>
      </div>

      {showMenu && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[8rem] rounded-xl border border-border bg-surface-2 py-1 shadow-card-hover ring-1 ring-border-strong">
          <button
            onClick={() => { setRenaming(true); setShowMenu(false); }}
            className="block w-full px-3 py-1.5 text-left text-xs text-content-dim hover:bg-surface-3"
          >
            Rename
          </button>
          <button
            onClick={handleDelete}
            disabled={pending}
            className="block w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-surface-3 disabled:opacity-40"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function DensityIcon({ level }: { level: Density }) {
  if (level === 1) {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <rect x="0" y="0" width="3" height="14" rx="1" />
        <rect x="4" y="0" width="3" height="14" rx="1" />
        <rect x="8" y="0" width="3" height="14" rx="1" />
        <rect x="12" y="0" width="2" height="14" rx="1" />
      </svg>
    );
  }
  if (level === 2) {
    return (
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
        <rect x="0" y="0" width="5" height="14" rx="1" />
        <rect x="6" y="0" width="5" height="14" rx="1" />
        <rect x="12" y="0" width="2" height="14" rx="1" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
      <rect x="0" y="0" width="6" height="14" rx="1" />
      <rect x="8" y="0" width="6" height="14" rx="1" />
    </svg>
  );
}
