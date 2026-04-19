import { createClient, RedisClientType } from "redis";

let redisClient: RedisClientType | null = null;
let redisClientInitPromise: Promise<RedisClientType> | null = null;

export async function setupRedis(): Promise<RedisClientType> {
  const url = process.env.REDIS_URL;

  if (!url) {
    throw new Error("REDIS_URL is not defined");
  }

  if (redisClient) {
    return redisClient;
  }

  if (redisClientInitPromise) {
    return redisClientInitPromise;
  }

  redisClientInitPromise = (async () => {
    try {
      const client = createClient({ url });

      client.on("error", (error) => {
        console.error("[Redis] Error:", error);
      });

      client.on("reconnecting", () => {
        console.warn("[Redis] Reconnecting...");
      });

      await client.connect();
      console.log("[Redis] Connected successfully");

      redisClient = client as RedisClientType;
      return client;
    } catch (error) {
      redisClientInitPromise = null;
      console.error(
        "[Redis] Failed to connect:",
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  })() as Promise<RedisClientType>;

  return redisClientInitPromise as Promise<RedisClientType>; // Either way if this is null that means the app is dead.
}

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error("Redis client not initialized. Call setupRedis() first.");
  }

  return redisClient;
}
