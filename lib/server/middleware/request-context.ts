import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_CONFIG } from "@/lib/server/config/constants";
import { Logger } from "@/lib/server/logger/logger";

export interface RequestContext {
  correlationId: string;
  startTime: number;
  logger: Logger;
}

export function getRequestContext(request: NextRequest): RequestContext {
  const correlationId =
    request.headers.get(AUTH_CONFIG.CORRELATION_ID_HEADER) ||
    request.headers.get("x-correlation-id") ||
    `req_${randomUUID().replace(/-/g, "")}`;
  const startTime = Date.now();
  const reqLogger = new Logger(correlationId, {
    method: request.method,
    path: request.nextUrl.pathname,
    ip: request.headers.get("x-forwarded-for") || "unknown",
  });

  return { correlationId, startTime, logger: reqLogger };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage?: boolean;
}

export interface ApiResponseOptions {
  status?: number;
  message?: string;
  correlationId?: string;
  pagination?: PaginationMeta;
  headers?: Record<string, string>;
  // When wrapping legacy payloads, extra fields can be merged
  extra?: Record<string, unknown>;
}

export function standardResponse<T = unknown>(
  data: T,
  options: ApiResponseOptions = {},
): NextResponse {
  const { status = 200, message = "Success", correlationId, pagination, headers = {}, extra = {} } = options;

  const payload: Record<string, unknown> = {
    success: true,
    message,
    ...(data && typeof data === "object" && !Array.isArray(data) ? data : { data }),
    ...(pagination ? { pagination } : {}),
    ...(correlationId ? { correlationId } : {}),
    ...extra,
  };

  const responseHeaders = new Headers(headers);
  if (correlationId) {
    responseHeaders.set(AUTH_CONFIG.CORRELATION_ID_HEADER, correlationId);
  }
  // Standard security headers
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  responseHeaders.set("X-Frame-Options", "DENY");
  responseHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return NextResponse.json(payload, {
    status,
    headers: responseHeaders,
  });
}
