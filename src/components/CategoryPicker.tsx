"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { setEntryCategories } from "@/lib/library";

interface Category {
  id: string;
  name: string;
}

interface Props {
  sourceId: string;
  slug: string;
  categories: Category[];
  assignedIds: string[];
  followed: boolean;
}

export function CategoryPicker({ sourceId, slug, categories, assignedIds, followed }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(assignedIds));
  const [pending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelected(new Set(assignedIds));
  }, [assignedIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!followed) return null;
  if (categories.length === 0) {
    return (
      <span className="rounded-md bg-surface-2 px-4 py-2 text-sm text-content-faint">
        No categories — create one in the library
      </span>
    );
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      try {
        await setEntryCategories(sourceId, slug, [...selected]);
        toast.success("Categories updated");
        setOpen(false);
      } catch {
        toast.error("Failed to update categories");
      }
    });
  }

  const label =
    selected.size === 0
      ? "Categorise"
      : selected.size === 1
      ? categories.find((c) => selected.has(c.id))?.name ?? "1 category"
      : `${selected.size} categories`;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-md bg-surface-2 px-4 py-2 text-sm font-medium text-content-dim hover:bg-surface-3 transition"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {label}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 min-w-[12rem] rounded-xl border border-border bg-surface-2 shadow-card-hover ring-1 ring-border-strong">
          <ul role="listbox" aria-multiselectable className="py-1">
            {categories.map((cat) => {
              const checked = selected.has(cat.id);
              return (
                <li key={cat.id}>
                  <button
                    role="option"
                    aria-selected={checked}
                    onClick={() => toggle(cat.id)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-3 transition"
                  >
                    <span
                      className={[
                        "flex h-4 w-4 flex-none items-center justify-center rounded ring-1 transition",
                        checked
                          ? "bg-accent ring-accent text-white"
                          : "bg-surface-3 ring-border text-transparent",
                      ].join(" ")}
                    >
                      {checked && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path
                            d="M1 3.5L4 6.5L9 1"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="text-content-dim">{cat.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-border px-3 py-2">
            <button
              onClick={save}
              disabled={pending}
              className="w-full rounded-lg bg-accent py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40 transition"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
