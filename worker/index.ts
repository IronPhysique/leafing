import { Worker, QueueEvents, Queue } from "bullmq";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  redisConnection,
  DOWNLOAD_QUEUE,
  UPDATE_QUEUE,
  type DownloadJobData,
  type UpdateJobData,
} from "../lib/queue";
import { getSource } from "../lib/sources";
import { chapterDir } from "../lib/storage";
import { prisma } from "../lib/db";
import { checkUpdates } from "./checkUpdates";

const connection = redisConnection();

function extFromUrl(url: string): string {
  const m = url.split("?")[0].match(/\.(jpg|jpeg|png|webp|gif|avif)$/i);
  return m ? `.${m[1].toLowerCase()}` : ".jpg";
}

async function downloadChapter(data: DownloadJobData): Promise<void> {
  const { downloadId, sourceId, slug, chapterRef } = data;
  await prisma.download.update({ where: { id: downloadId }, data: { status: "running", error: null } });

  const source = getSource(sourceId);
  const { pages } = await source.getChapter(slug, chapterRef);
  if (pages.length === 0) throw new Error("no pages returned");

  const dir = chapterDir(sourceId, slug, chapterRef);
  await fs.mkdir(dir, { recursive: true });

  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 manhwa-reader/0.1",
    };
    if (p.referer) headers.Referer = p.referer;

    const res = await fetch(p.url, { headers });
    if (!res.ok || !res.body) throw new Error(`page ${i + 1}: HTTP ${res.status}`);

    const name = String(i + 1).padStart(4, "0") + extFromUrl(p.url);
    await pipeline(
      Readable.fromWeb(res.body as import("node:stream/web").ReadableStream),
      createWriteStream(path.join(dir, name)),
    );

    await new Promise((r) => setTimeout(r, 150));
  }

  await prisma.download.update({
    where: { id: downloadId },
    data: { status: "done", pageCount: pages.length, localDir: dir },
  });
  console.log(`[worker] downloaded ${pages.length} pages -> ${dir}`);
}

const downloadWorker = new Worker<DownloadJobData>(
  DOWNLOAD_QUEUE,
  async (job) => {
    console.log(`[worker] job ${job.id}: ${job.data.sourceId}/${job.data.slug}/${job.data.chapterRef}`);
    try {
      await downloadChapter(job.data);
    } catch (e) {
      await prisma.download
        .update({ where: { id: job.data.downloadId }, data: { status: "error", error: (e as Error).message } })
        .catch(() => {});
      throw e;
    }
  },
  { connection, concurrency: 2 },
);

const downloadEvents = new QueueEvents(DOWNLOAD_QUEUE, { connection });
downloadEvents.on("failed", ({ jobId, failedReason }) =>
  console.error(`[worker] download failed ${jobId}: ${failedReason}`),
);

async function enqueueAllFollowed(queue: Queue<UpdateJobData>): Promise<number> {
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
    await queue.add(
      "check-updates",
      { sourceId: entry.sourceId, slug: entry.slug },
      {
        jobId,
        attempts: 3,
        backoff: { type: "exponential", delay: 10_000 },
        removeOnComplete: true,
        removeOnFail: 20,
      },
    );
  }
  console.log(`[worker/updates] enqueued ${distinct.length} series (from ${allEntries.length} profile-entries)`);
  return distinct.length;
}

const updateWorker = new Worker<UpdateJobData>(
  UPDATE_QUEUE,
  async (job) => {
    if (job.name === "check-updates-scheduled") {
      const uQueue = new Queue<UpdateJobData>(UPDATE_QUEUE, { connection });
      await enqueueAllFollowed(uQueue);
      await uQueue.close();
      return;
    }
    console.log(`[worker/updates] job ${job.id}: ${job.data.sourceId}/${job.data.slug}`);
    await checkUpdates(job.data);
  },
  { connection, concurrency: 3 },
);

const updateEvents = new QueueEvents(UPDATE_QUEUE, { connection });
updateEvents.on("failed", ({ jobId, failedReason }) =>
  console.error(`[worker/updates] failed ${jobId}: ${failedReason}`),
);

const REPEATABLE_JOB_NAME = "check-updates-scheduled";
const UPDATE_EVERY_MS = 6 * 60 * 60 * 1000;

async function registerRepeatable(): Promise<void> {
  const uQueue = new Queue<UpdateJobData>(UPDATE_QUEUE, { connection });

  const existing = await uQueue.getRepeatableJobs();
  for (const r of existing) {
    if (r.name === REPEATABLE_JOB_NAME) {
      await uQueue.removeRepeatableByKey(r.key);
    }
  }

  await uQueue.add(
    REPEATABLE_JOB_NAME,
    { sourceId: "__scheduler__", slug: "__scheduler__" },
    { repeat: { every: UPDATE_EVERY_MS }, removeOnComplete: true },
  );

  console.log("[worker/updates] 6 h repeatable registered");
  await uQueue.close();
}

(async () => {
  try {
    await registerRepeatable();
  } catch (e) {
    console.error("[worker/updates] repeatable registration failed:", e);
  }
  try {
    const { updateQueue } = await import("../lib/queue");
    await enqueueAllFollowed(updateQueue);
  } catch (e) {
    console.error("[worker/updates] boot enqueue failed:", e);
  }
})();

console.log("[worker] listening on queues:", DOWNLOAD_QUEUE, UPDATE_QUEUE);

process.on("SIGTERM", async () => {
  await Promise.all([
    downloadWorker.close(),
    updateWorker.close(),
    downloadEvents.close(),
    updateEvents.close(),
  ]);
  await prisma.$disconnect();
  process.exit(0);
});

export { enqueueAllFollowed };
