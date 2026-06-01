"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface BackfillResult {
  processed: number;
  resolved: number;
  skipped: number;
}

export function ResolveTitlesButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/library/backfill-titles", { method: "POST" });
      if (!res.ok) throw new Error("Request failed");
      const data: BackfillResult = await res.json();
      toast.success(
        data.processed === 0
          ? "All titles already resolved"
          : `Resolved ${data.resolved} of ${data.processed} titles`,
      );
      router.refresh();
    } catch {
      toast.error("Failed to resolve titles");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title="Fetch AniList titles for library entries that are missing them"
      className="rounded-md bg-surface-2 px-3 py-1.5 text-sm font-medium text-content-dim ring-1 ring-border transition hover:bg-surface-3 hover:text-content disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "Resolving..." : "Resolve titles"}
    </button>
  );
}
