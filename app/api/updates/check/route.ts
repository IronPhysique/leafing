import { prisma } from "@/lib/db";
import { updateQueue } from "@/lib/queue";
import type { UpdateJobData } from "@/lib/queue";

export async function POST() {
  const allEntries = await prisma.libraryEntry.findMany({
    select: { sourceId: true, slug: true },
  });

  const seen = new Set<string>();
  const distinct: Array<{ sourceId: string; slug: string }> = [];
  for (const entry of allEntries) {
    const key = `${entry.sourceId}:${entry.slug}`;
    if (!seen.has(key)) {
      seen.add(key);
      distinct.push(entry);
    }
  }

  for (const entry of distinct) {
    const jobId = `upd:${entry.sourceId}:${entry.slug}`;
    await updateQueue.add(
      "check-updates",
      { sourceId: entry.sourceId, slug: entry.slug } satisfies UpdateJobData,
      {
        jobId,
        attempts: 3,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: true,
        removeOnFail: 20,
      },
    );
  }

  return Response.json({ enqueued: distinct.length });
}
