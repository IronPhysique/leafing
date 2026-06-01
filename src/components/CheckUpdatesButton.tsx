"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CheckUpdatesButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/updates/check", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const data: { enqueued: number } = await res.json();
      toast.success(
        data.enqueued === 0
          ? "No series to check"
          : `Checking ${data.enqueued} series for updates`,
      );
      router.refresh();
    } catch {
      toast.error("Failed to enqueue update check");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rounded-md bg-surface-2 px-3 py-1.5 text-sm font-medium text-content-dim ring-1 ring-border transition hover:bg-surface-3 hover:text-content disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "Checking..." : "Check for updates"}
    </button>
  );
}
