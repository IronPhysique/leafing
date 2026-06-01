import { Queue, type ConnectionOptions } from "bullmq";

export interface UpdateJobData {
  sourceId: string;
  slug: string;
}

export function redisConnection(): ConnectionOptions {
  const url = new URL(process.env.REDIS_URL ?? "redis://redis:6379");
  return {
    host: url.hostname,
    port: Number(url.port || "6379"),
    password: url.password || undefined,
  };
}

export interface DownloadJobData {
  downloadId: string;
  sourceId: string;
  slug: string;
  chapterRef: string;
}

export const DOWNLOAD_QUEUE = "download";
export const UPDATE_QUEUE = "updates";

const g = globalThis as unknown as {
  downloadQueue?: Queue<DownloadJobData>;
  updateQueue?: Queue<UpdateJobData>;
};

export const downloadQueue: Queue<DownloadJobData> =
  g.downloadQueue ?? new Queue<DownloadJobData>(DOWNLOAD_QUEUE, { connection: redisConnection() });
if (process.env.NODE_ENV !== "production") g.downloadQueue = downloadQueue;

export const updateQueue: Queue<UpdateJobData> =
  g.updateQueue ?? new Queue<UpdateJobData>(UPDATE_QUEUE, { connection: redisConnection() });
if (process.env.NODE_ENV !== "production") g.updateQueue = updateQueue;
