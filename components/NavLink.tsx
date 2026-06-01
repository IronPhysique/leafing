"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  children,
  count,
}: {
  href: string;
  children: React.ReactNode;
  count?: number;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={
        "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition " +
        (active
          ? "bg-surface-2 text-content"
          : "text-content-dim hover:bg-surface-2 hover:text-content")
      }
    >
      {children}
      {count != null && count > 0 && (
        <span className="inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-accent px-1 py-px text-[10px] font-bold leading-tight text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
