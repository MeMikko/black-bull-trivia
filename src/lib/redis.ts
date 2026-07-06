import { createClient, type RedisClientType } from "redis";

const globalForRedis = globalThis as typeof globalThis & {
  redis?: RedisClientType;
  redisConnecting?: Promise<RedisClientType>;
};

export function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}

export async function getRedis(): Promise<RedisClientType> {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not configured");
  }

  if (globalForRedis.redis?.isOpen) {
    return globalForRedis.redis;
  }

  if (!globalForRedis.redisConnecting) {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on("error", (err) => console.error("Redis error:", err));
    globalForRedis.redisConnecting = client.connect().then(() => {
      globalForRedis.redis = client;
      return client;
    });
  }

  return globalForRedis.redisConnecting;
}