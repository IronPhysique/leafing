"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Profile } from "@prisma/client";

type AvatarSize = "sm" | "xs";

export function AvatarDisplay({
  avatar,
  name,
  size = "sm",
}: {
  avatar: string | null;
  name: string;
  size?: AvatarSize;
}) {
  const dim = size === "sm" ? "h-8 w-8 text-base" : "h-6 w-6 text-xs";
  const isColor = avatar?.startsWith("#");
  if (isColor) {
    return (
      <div
        className={`${dim} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`}
        style={{ backgroundColor: avatar! }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <div
      className={`${dim} rounded-full bg-surface-2 flex items-center justify-center ring-1 ring-border flex-shrink-0`}
    >
      <span className="leading-none">{avatar ?? name.charAt(0).toUpperCase()}</span>
    </div>
  );
}

export function ProfileMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative ml-auto flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-lg px-2 py-1 transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <AvatarDisplay avatar={profile.avatar} name={profile.name} size="sm" />
        <span className="max-w-[7rem] truncate text-sm font-medium text-content-dim group-hover:text-content hidden sm:block">
          {profile.name}
        </span>
        <svg
          className={`h-3.5 w-3.5 text-content-faint transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 16 16"
          fill="currentColor"
          aria-hidden
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-border bg-surface shadow-xl z-50 py-1 origin-top-right"
        >
          <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border">
            <AvatarDisplay avatar={profile.avatar} name={profile.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-content">{profile.name}</p>
              <p className="text-xs text-content-faint">Active profile</p>
            </div>
          </div>

          <div className="py-1">
            <Link
              href="/profiles"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-content-dim hover:bg-surface-2 hover:text-content transition-colors"
            >
              <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-7 9a7 7 0 0 1 14 0H0zm12.5-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM17 16a5 5 0 0 0-5-5h-.5a5 5 0 0 1 5 5H17z" />
              </svg>
              Switch profile
            </Link>

            <Link
              href="/profiles/manage"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-content-dim hover:bg-surface-2 hover:text-content transition-colors"
            >
              <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M10 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0-9a7 7 0 1 1 0 14A7 7 0 0 1 10 3zm0 1.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z" />
              </svg>
              Manage profiles
            </Link>

            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-sm text-content-dim hover:bg-surface-2 hover:text-content transition-colors"
            >
              <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 0 1-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 0 1 .947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 0 1 2.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 0 1 2.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 0 1 .947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 0 1-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 0 1-2.287-.947zM10 13a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" clipRule="evenodd" />
              </svg>
              Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
