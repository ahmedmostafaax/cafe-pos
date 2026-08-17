import Redis from "ioredis";

let redis = null;

try {
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  redis = new Redis(url, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: () => null, // do not keep retrying forever
  });

  redis.on("connect", () => console.log("Redis connected"));
  redis.on("error", (err) => {
    // Log once-style: avoid flooding if Redis is down
    if (process.env.NODE_ENV !== "production") {
      console.warn("Redis:", err.message);
    }
  });
} catch (err) {
  console.warn("Redis not available, continuing without it");
  redis = null;
}

export default redis;

