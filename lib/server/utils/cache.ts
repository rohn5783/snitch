import Redis from "ioredis";
import { CACHE_TTL } from "@/lib/server/config/constants";
import { getServerEnv } from "@/lib/server/config/env";
import { logger } from "@/lib/server/logger/logger";

interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}

class CacheManager {
  private redisClient: Redis | null = null;
  private memoryCache = new Map<string, MemoryCacheEntry>();
  private redisFailed = false;

  constructor() {
    this.initRedis();
    this.startMemoryJanitor();
  }

  private initRedis() {
    const env = getServerEnv();
    if (!env.REDIS_URL) {
      return;
    }

    try {
      this.redisClient = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        enableOfflineQueue: false,
        retryStrategy: (times) => {
          if (times > 3) {
            this.redisFailed = true;
            return null; // Stop reconnecting after 3 attempts
          }
          return Math.min(times * 100, 1000);
        },
      });

      this.redisClient.on("error", (err) => {
        if (!this.redisFailed) {
          logger.warn("Redis connection error, falling back to in-memory cache", { error: err.message });
          this.redisFailed = true;
        }
      });

      this.redisClient.on("connect", () => {
        this.redisFailed = false;
        logger.info("Connected to Redis cache successfully");
      });
    } catch (err) {
      this.redisFailed = true;
      logger.warn("Failed to instantiate Redis client, using in-memory cache", { error: err });
    }
  }

  private startMemoryJanitor() {
    if (typeof setInterval !== "undefined") {
      setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of this.memoryCache.entries()) {
          if (now > entry.expiresAt) {
            this.memoryCache.delete(key);
          }
        }
      }, 60000).unref?.();
    }
  }

  public isRedisConnected(): boolean {
    return Boolean(this.redisClient && !this.redisFailed && this.redisClient.status === "ready");
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.isRedisConnected() && this.redisClient) {
      try {
        const raw = await this.redisClient.get(key);
        if (raw) return JSON.parse(raw) as T;
      } catch (err) {
        logger.debug("Redis get failed, checking memory fallback", { key, error: err });
      }
    }

    const memoryEntry = this.memoryCache.get(key);
    if (!memoryEntry) return null;
    if (Date.now() > memoryEntry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    try {
      return JSON.parse(memoryEntry.value) as T;
    } catch {
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number = CACHE_TTL.DEFAULT): Promise<void> {
    const serialized = JSON.stringify(value);

    if (this.isRedisConnected() && this.redisClient) {
      try {
        await this.redisClient.set(key, serialized, "EX", ttlSeconds);
        return;
      } catch (err) {
        logger.debug("Redis set failed, storing in memory fallback", { key, error: err });
      }
    }

    this.memoryCache.set(key, {
      value: serialized,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.memoryCache.delete(key);

    if (this.isRedisConnected() && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (err) {
        logger.debug("Redis del failed", { key, error: err });
      }
    }
  }

  async delPattern(pattern: string): Promise<void> {
    // Invalidate matching memory keys
    const regex = new RegExp(`^${pattern.replace(/\*/g, ".*")}$`);
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }

    if (this.isRedisConnected() && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      } catch (err) {
        logger.debug("Redis delPattern failed", { pattern, error: err });
      }
    }
  }

  async wrap<T>(key: string, fn: () => Promise<T>, ttlSeconds: number = CACHE_TTL.DEFAULT): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    const fresh = await fn();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttlSeconds);
    }
    return fresh;
  }

  async flush(): Promise<void> {
    this.memoryCache.clear();
    if (this.isRedisConnected() && this.redisClient) {
      try {
        await this.redisClient.flushdb();
      } catch (err) {
        logger.debug("Redis flushdb failed", { error: err });
      }
    }
  }
}

export const cache = new CacheManager();

