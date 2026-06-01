"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import { ProfileMenu } from "@/components/ProfileMenu";
import type { Profile } from "@prisma/client";

interface AppHeaderProps {
  activeProfile: Profile | null;
  totalUnread: number;
}

function LeafMark() {
  return (
    <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl bg-accent/15 ring-1 ring-accent/30">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className="text-accent"
      >
        <path
          d="M12 21C12 21 4 16 4 9.5C4 6.46 6.46 4 9.5 4C10.74 4 11.88 4.42 12.78 5.13C13.68 4.42 14.82 4 16.06 4C19.1 4 21.56 6.46 21.56 9.5C21.56 16 12 21 12 21Z"
          fill="currentColor"
          fillOpacity="0.25"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M12 21L12 10"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>
    </span>
  );
}

function SearchBar() {
  function open() {
    window.dispatchEvent(new CustomEvent("manhwa:open-palette"));
  }

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open search"
      className="
        flex min-w-0 flex-1 items-center gap-2.5 rounded-xl
        border border-border bg-surface px-3.5 py-2
        text-sm text-content-dim
        transition-colors hover:border-border-strong hover:bg-surface-2 hover:text-content
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
        sm:max-w-sm md:max-w-md
      "
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
        className="flex-shrink-0 text-content-faint"
      >
        <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      <span className="flex-1 truncate text-left text-content-dim">
        Search Leafing&hellip;
      </span>

      <span className="hidden sm:flex items-center gap-0.5 text-[10px] text-content-faint flex-shrink-0">
        <kbd className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded border border-border bg-surface-2 px-1 font-mono text-[10px] leading-none">
          ⌘K
        </kbd>
      </span>
    </button>
  );
}

export function AppHeader({ activeProfile, totalUnread }: AppHeaderProps) {
  const pathname = usePathname();

  if (pathname.startsWith("/profiles")) return null;

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-2.5">
        <Link
          href="/"
          className="flex flex-shrink-0 items-center gap-2 font-semibold tracking-tight text-content hover:text-content/90 transition-colors"
        >
          <LeafMark />
          <span className="hidden sm:block">Leafing</span>
        </Link>

        <nav className="hidden md:flex gap-1 text-sm">
          <NavLink href="/library" count={totalUnread}>Library</NavLink>
          <NavLink href="/updates" count={totalUnread}>Updates</NavLink>
          <NavLink href="/search">Browse</NavLink>
          <NavLink href="/settings">Settings</NavLink>
        </nav>

        <div className="flex flex-1 justify-center px-2 md:px-4">
          <SearchBar />
        </div>

        {activeProfile && <ProfileMenu profile={activeProfile} />}
      </div>
    </header>
  );
}
