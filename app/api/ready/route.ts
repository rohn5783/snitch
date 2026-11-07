import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/server/database/connection";
import { cache } from "@/lib/server/utils/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
    { status: isReady ? 200 : 503 },
  );
}
