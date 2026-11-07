import { createHmac, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { AUTH_CONFIG } from "@/lib/server/config/constants";
import { getServerEnv } from "@/lib/server/config/env";
import { AppError } from "@/lib/server/errors/api-error";

export function generateCsrfToken(): { token: string; cookieValue: string } {
  const secret = getServerEnv().JWT_SECRET;
  const rawToken = randomBytes(24).toString("hex");
  const signature = createHmac("sha256", secret).update(rawToken).digest("hex");
  const cookieValue = `${rawToken}.${signature}`;
  return { token: rawToken, cookieValue };
}

export function verifyCsrfToken(request: NextRequest): boolean {
  // Safe HTTP methods do not require CSRF protection
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return true;
  }

  // Exempt webhooks which authenticate via cryptographic signatures
  const path = request.nextUrl.pathname;
  if (path.includes("/webhook")) {
    return true;
  }

  const cookie = request.cookies.get(AUTH_CONFIG.CSRF_COOKIE_NAME)?.value;
  const headerToken =
    request.headers.get(AUTH_CONFIG.CSRF_HEADER_NAME) ||
    request.headers.get("x-csrf-token");

  // If request is not cookie-authenticated, standard CORS applies
  const authToken = request.cookies.get(AUTH_CONFIG.COOKIE_NAME)?.value;
  if (!authToken) {
    return true;
  }

  // If cookie and header are missing or invalid
  if (!cookie || !headerToken) {
    // For legacy frontend compatibility when csrf_token isn't sent yet, check origin/referer
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host && (origin.includes(host) || origin.includes("localhost") || origin.includes("127.0.0.1"))) {
      return true;
    }
    return false;
  }

  const [rawToken, signature] = cookie.split(".");
  if (!rawToken || !signature || rawToken !== headerToken) {
    return false;
  }

  const secret = getServerEnv().JWT_SECRET;
  const expectedSig = createHmac("sha256", secret).update(rawToken).digest("hex");
  return signature === expectedSig;
}

export function assertCsrf(request: NextRequest): void {
  if (!verifyCsrfToken(request)) {
    throw AppError.forbidden("CSRF verification failed or origin mismatch");
  }
}

