import { AppError } from "@/lib/server/errors/api-error";
import type { NextRequest } from "next/server";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory token bucket / sliding window fallback
const memoryStore = new Map<string, RateLimitRecord>();

// Cleanup stale memory records periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (now > record.resetAt) {
        memoryStore.delete(key);
      }
    }
  }, 60000).unref?.();
}

export interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
  prefix?: string;
  identifier?: (request: NextRequest) => string;
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"
  );
}

export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const { windowSeconds, maxRequests, prefix = "rl" } = options;
  const id = options.identifier ? options.identifier(request) : getClientIp(request);
  const key = `${prefix}:${id}`;
  const now = Date.now();

  const existing = memoryStore.get(key);
  if (!existing || now > existing.resetAt) {
    const record: RateLimitRecord = {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    };
    memoryStore.set(key, record);
    return { allowed: true, remaining: maxRequests - 1, resetAt: record.resetAt };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: maxRequests - existing.count, resetAt: existing.resetAt };
}

export async function assertRateLimit(
  request: NextRequest,
  options: RateLimitOptions,
): Promise<void> {
  const result = await rateLimit(request, options);
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    throw AppError.rateLimited(
      `Too many requests. Please try again in ${retryAfter} seconds.`,
      { retryAfter },
    );
  }
}

