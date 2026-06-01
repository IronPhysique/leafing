"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import type { SourceChapterSummary } from "@/lib/sources/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function ChapterRow({
  source,
  slug,
  chapter,
  read,
  pageProgress,
  downloadStatus,
}: {
  source: string;
  slug: string;
  chapter: SourceChapterSummary;
  read: boolean;
  pageProgress?: number;
  downloadStatus?: string;
}) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(downloadStatus);
  const [pending, startTransition] = useTransition();

  const label = `Ch. ${chapter.number}${chapter.title ? ` — ${chapter.title}` : ""}`;
  const date = formatDate(chapter.publishedAt);

  function queueDownload() {
    startTransition(async () => {
      setOptimisticStatus("queued");
      const res = await fetch("/api/downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: source,
          slug,
          chapterRef: chapter.ref,
          title: label,
        }),
      });
      if (res.ok) {
        toast.success("Download queued");
      } else {
        setOptimisticStatus("error");
        toast.error("Failed to queue download");
      }
    });
  }

  const inner = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        {read ? (
          <span className="text-emerald-400" title="Read">✓</span>
        ) : pageProgress != null ? (
          <span className="text-amber-400" title={`On page ${pageProgress + 1}`}>◐</span>
        ) : (
          <span className="text-white/20">○</span>
        )}
        <span className={"truncate " + (read ? "text-content-faint" : "text-content")}>{label}</span>
      </span>
      <span className="flex flex-none items-center gap-3 text-xs text-content-faint">
        {chapter.group && <span className="hidden sm:inline">{chapter.group}</span>}
        {date && <span className="hidden md:inline">{date}</span>}
      </span>
    </>
  );

  if (chapter.externalUrl) {
    return (
      <li className="flex items-center justify-between gap-3 px-3 py-2.5">
        <a
          href={chapter.externalUrl}
          target="_blank"
          rel="noreferrer"
          className="flex min-w-0 flex-1 items-center justify-between gap-3 hover:text-white"
          title="Hosted off-site — opens in a new tab"
        >
          {inner}
        </a>
        <span className="flex-none rounded bg-surface px-1.5 py-0.5 text-[10px] uppercase text-content-faint ring-1 ring-border">
          external ↗
        </span>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-surface-2">
      <Link
        href={`/read/${source}/${encodeURIComponent(slug)}/${encodeURIComponent(chapter.ref)}`}
        className="flex min-w-0 flex-1 items-center justify-between gap-3"
      >
        {inner}
      </Link>
      <button
        onClick={queueDownload}
        disabled={pending || optimisticStatus === "done" || optimisticStatus === "queued" || optimisticStatus === "running"}
        title={
          optimisticStatus === "done"
            ? "Downloaded"
            : optimisticStatus === "running" || optimisticStatus === "queued"
              ? "Downloading…"
              : "Download for offline reading"
        }
        className="flex-none rounded p-1 text-content-faint transition hover:bg-surface-3 hover:text-content disabled:hover:bg-transparent"
      >
        {optimisticStatus === "done" ? "✓⤓" : optimisticStatus === "error" ? "⚠" : optimisticStatus ? "…" : "⤓"}
      </button>
    </li>
  );
}
