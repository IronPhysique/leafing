import Redis from "ioredis";

const DISABLED = !!process.env.VITEST;

const g = globalThis as unknown as { _cacheRedis?: Redis | null };

function getClient(): Redis | null {
  if (DISABLED) return null;
  if (g._cacheRedis !== undefined) return g._cacheRedis;
  try {
    const client = new Redis(process.env.REDIS_URL ?? "redis://redis:6379", {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    client.on("error", () => {});
    g._cacheRedis = client;
  } catch {
    g._cacheRedis = null;
  }
  return g._cacheRedis ?? null;
}

export async function cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const client = getClient();
  if (client) {
    try {
      const hit = await client.get(key);
      if (hit !== null) return JSON.parse(hit) as T;
    } catch {
      return fn();
    }
  }

  const value = await fn();

  if (client && value != null) {
    try {
      await client.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch {
      return value;
    }
  }

  return value;
}
