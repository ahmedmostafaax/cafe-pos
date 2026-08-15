import Redis from "ioredis";

let redis = null;

try {
  redis = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  redis.on("connect", () => console.log("Redis connected"));
  redis.on("error", (err) => console.error("Redis error:", err.message));
} catch (err) {
  console.warn("Redis not available, continuing without it");
}

export default redis;
