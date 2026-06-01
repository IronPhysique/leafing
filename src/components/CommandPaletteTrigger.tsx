"use client";

export function CommandPaletteTrigger() {
  function open() {
    window.dispatchEvent(new CustomEvent("manhwa:open-palette"));
  }

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open search palette"
      className="ml-auto flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-content-dim
                 transition hover:border-border-strong hover:text-content"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="hidden sm:inline">Search</span>
      <span className="hidden sm:flex items-center gap-0.5 text-[10px] text-content-faint">
        <kbd className="inline-flex items-center justify-center rounded border border-border bg-surface-2 px-1 font-mono text-[10px]">
          ⌘K
        </kbd>
      </span>
    </button>
  );
}
