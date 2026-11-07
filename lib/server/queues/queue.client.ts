import { Queue } from "bullmq";
import Redis from "ioredis";
import { getServerEnv } from "@/lib/server/config/env";
import { logger } from "@/lib/server/logger/logger";

export const QUEUE_NAMES = {
  NOTIFICATIONS: "snitch-notifications",
  INVENTORY: "snitch-inventory",
  MAINTENANCE: "snitch-maintenance",
} as const;

type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const queues = new Map<string, Queue>();
let redisConnection: Redis | null = null;
let queueDisabled = false;

function getRedisConnection(): Redis | null {
  if (queueDisabled) return null;
  if (redisConnection) return redisConnection;

  const env = getServerEnv();
  if (!env.REDIS_URL) {
    queueDisabled = true;
    return null;
  }

  try {
    redisConnection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 2500,
      retryStrategy: (times) => {
        if (times > 2) {
          queueDisabled = true;
          return null;
        }
        return 500;
      },
    });

    redisConnection.on("error", (err) => {
      logger.warn("BullMQ Redis connection error, queue operates in fallback mode", { error: err.message });
      queueDisabled = true;
    });

    return redisConnection;
  } catch (err) {
    logger.warn("Failed to connect to BullMQ Redis, falling back", { error: err });
    queueDisabled = true;
    return null;
  }
}

export function getQueue(name: QueueName): Queue | null {
  if (queueDisabled) return null;
  if (queues.has(name)) return queues.get(name)!;

  const connection = getRedisConnection();
  if (!connection) return null;

  try {
    const queue = new Queue(name, {
      connection: connection as unknown as import("bullmq").ConnectionOptions,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1500,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });
    queues.set(name, queue);
    return queue;
  } catch (err) {
    logger.warn(`Could not initialize BullMQ queue ${name}`, { error: err });
    return null;
  }
}

export async function enqueueJob<T = Record<string, unknown>>(
  queueName: QueueName,
  jobName: string,
  data: T,
): Promise<void> {
  const queue = getQueue(queueName);

  if (queue && !queueDisabled) {
    try {
      await queue.add(jobName, data);
      logger.debug("Enqueued background job to BullMQ", { queueName, jobName });
      return;
    } catch (err) {
      logger.warn("Enqueue failed, executing async fallback", { queueName, jobName, error: err });
    }
  }

  // Graceful fallback: run asynchronously in background without blocking HTTP thread
  setImmediate(async () => {
    try {
      const { processFallbackJob } = await import("@/lib/server/jobs/workers");
      await processFallbackJob(queueName, jobName, data);
    } catch (err) {
      logger.error("Fallback background job execution failed", err, { queueName, jobName });
    }
  });
}

