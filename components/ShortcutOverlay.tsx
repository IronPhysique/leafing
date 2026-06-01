"use client";

import { useEffect, useState } from "react";

interface ShortcutGroup {
  label: string;
  shortcuts: { keys: string[]; description: string }[];
}

const GROUPS: ShortcutGroup[] = [
  {
    label: "Reader — navigation",
    shortcuts: [
      { keys: ["←", "→"], description: "Previous / next page (paged mode)" },
      { keys: ["Space"], description: "Next page (paged mode)" },
      { keys: ["[", "]"], description: "Previous / next chapter" },
      { keys: ["Esc"], description: "Back to series" },
    ],
  },
  {
    label: "Reader — display",
    shortcuts: [
      { keys: ["f"], description: "Cycle fit (width → height → screen → original)" },
      { keys: ["m"], description: "Toggle strip / paged mode" },
    ],
  },
  {
    label: "Global",
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open command palette / search" },
      { keys: ["/"], description: "Open command palette (when not typing)" },
      { keys: ["?"], description: "Toggle this shortcut reference" },
    ],
  },
];

export function ShortcutOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-border-strong bg-surface shadow-card-hover"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-content">Keyboard shortcuts</h2>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1.5 text-content-dim hover:bg-surface-2 hover:text-content"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M2 2l12 12M14 2L2 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="divide-y divide-border px-6 py-2">
          {GROUPS.map((group) => (
            <div key={group.label} className="py-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-content-faint">
                {group.label}
              </p>
              <div className="space-y-2">
                {group.shortcuts.map((s) => (
                  <div key={s.description} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-content-dim">{s.description}</span>
                    <span className="flex flex-shrink-0 items-center gap-1">
                      {s.keys.map((k) => (
                        <kbd
                          key={k}
                          className="inline-flex min-w-[1.75rem] items-center justify-center rounded border border-border-strong bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-content"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border px-6 py-3">
          <p className="text-xs text-content-faint">
            Press <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-border bg-surface-2 px-1 font-mono text-[10px]">?</kbd> or <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-border bg-surface-2 px-1 font-mono text-[10px]">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
