"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { toggleFollow } from "@/lib/library";

export function FollowButton({
  sourceId,
  slug,
  title,
  coverUrl,
  coverReferer,
  initiallyFollowed,
}: {
  sourceId: string;
  slug: string;
  title: string;
  coverUrl?: string;
  coverReferer?: string;
  initiallyFollowed: boolean;
}) {
  const [optimisticFollowed, setOptimisticFollowed] = useOptimistic(initiallyFollowed);
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const next = !optimisticFollowed;
          setOptimisticFollowed(next);
          try {
            await toggleFollow({ sourceId, slug, title, coverUrl, coverReferer });
            toast.success(next ? "Followed" : "Unfollowed");
          } catch {
            setOptimisticFollowed(!next);
            toast.error(next ? "Failed to follow" : "Failed to unfollow");
          }
        })
      }
      className={
        "rounded-md px-4 py-2 text-sm font-medium transition disabled:opacity-50 " +
        (optimisticFollowed
          ? "bg-surface-2 text-content hover:bg-surface-3"
          : "bg-accent text-white hover:bg-accent-hover")
      }
    >
      {pending ? "…" : optimisticFollowed ? "✓ Following" : "+ Follow"}
    </button>
  );
}
