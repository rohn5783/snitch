import mongoose from "mongoose";
import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/server/database/connection";
import { rateLimit } from "@/lib/server/middleware/rate-limiter";
import { cache } from "@/lib/server/utils/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const limit = await rateLimit(request, {
    windowSeconds: 60,
    maxRequests: 30,
    prefix: "rl:ready",
  });
  const rateLimitHeaders = {
    "X-RateLimit-Limit": "30",
    "X-RateLimit-Remaining": String(limit.remaining),
    "X-RateLimit-Reset": String(Math.ceil(limit.resetAt / 1000)),
  };

  if (!limit.allowed) {
    const retryAfter = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          ...rateLimitHeaders,
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  let dbStatus = "disconnected";
  let isDbReady = false;

  try {
    await connectDB();
    if (mongoose.connection.readyState === 1) {
      dbStatus = "connected";
      isDbReady = true;
    }
  } catch {
    dbStatus = "error";
  }

  const redisStatus = cache.isRedisConnected() ? "connected" : "fallback_memory";
  const isReady = isDbReady;

  return NextResponse.json(
    {
      ready: isReady,
      database: {
        provider: "mongodb",
        status: dbStatus,
      },
      cache: {
        provider: cache.isRedisConnected() ? "redis" : "in_memory",
        status: redisStatus,
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: isReady ? 200 : 503,
      headers: rateLimitHeaders,
    },
  );
}
