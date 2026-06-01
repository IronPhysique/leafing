"use client";

import { useRouter } from "next/navigation";
import { proxiedImage } from "@/lib/proxy";
import { coverVtName } from "@/lib/vt";
import type { CSSProperties } from "react";

export interface CoverProps {
  href: string;
  title: string;
  coverUrl?: string;
  coverReferer?: string;
  badge?: string;
  unreadCount?: number;
  vtKey?: string;
}

export function Cover({
  href,
  title,
  coverUrl,
  coverReferer,
  badge,
  unreadCount,
  vtKey,
}: CoverProps) {
  const router = useRouter();

  const proxied = coverUrl ? proxiedImage(coverUrl, coverReferer) : null;

  const imgStyle: CSSProperties = vtKey
    ? { viewTransitionName: coverVtName(vtKey) }
    : {};

  return (
    <a
      href={href}
      onMouseEnter={() => router.prefetch(href)}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
    >
      <div
        className={[
          "relative aspect-[2/3] overflow-hidden rounded-xl bg-surface",
          "shadow-card ring-1 ring-border",
          "transition duration-300",
          "motion-safe:group-hover:-translate-y-1",
          "motion-safe:group-hover:shadow-card-hover",
          "motion-safe:group-hover:ring-border-strong",
          "motion-safe:group-active:scale-[0.98]",
        ].join(" ")}
      >
        {proxied ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={proxied}
            alt={title}
            loading="lazy"
            decoding="async"
            style={imgStyle}
            className={[
              "h-full w-full object-cover",
              "transition-transform duration-500",
              "motion-safe:group-hover:scale-105",
            ].join(" ")}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-content-dim">
            No cover
          </div>
        )}

        {badge && (
          <span className="absolute left-2 top-2 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/90 ring-1 ring-white/10 backdrop-blur">
            {badge}
          </span>
        )}

        {unreadCount != null && unreadCount > 0 && (
          <span className="absolute right-2 top-2 min-w-[1.25rem] rounded-full bg-accent px-1.5 py-0.5 text-center text-[10px] font-bold leading-tight text-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2.5 pt-8">
          <div className="line-clamp-2 text-xs font-semibold leading-snug text-white drop-shadow">
            {title}
          </div>
        </div>
      </div>
    </a>
  );
}
