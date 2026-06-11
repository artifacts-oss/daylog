import Redis from 'ioredis';

const url = process.env.REDIS_URL;
if (!url) throw new Error('REDIS_URL environment variable is not set');

const g = globalThis as typeof globalThis & { __redis?: Redis };
if (!g.__redis) {
  g.__redis = new Redis(url, { maxRetriesPerRequest: 3 });
}
export const redis = g.__redis;

// Each SSE connection needs its own subscriber connection — ioredis blocks a
// connection in subscriber mode, so it cannot issue regular commands.
export function createSubscriber(): Redis {
  return new Redis(url!, { maxRetriesPerRequest: null, enableReadyCheck: false });
}
