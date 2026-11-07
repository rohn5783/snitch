import { NextResponse, type NextRequest } from "next/server";
import { AUTH_CONFIG } from "@/lib/server/config/constants";
import type { IUser } from "@/lib/server/models/user";
import { authService } from "@/lib/server/services/auth.service";

export interface AuthenticatedRequest extends NextRequest {
  user?: IUser;
}

export function extractAuthToken(request: NextRequest): string | undefined {
  // First look for HttpOnly cookie
  const cookieToken = request.cookies.get(AUTH_CONFIG.COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  // Fall back to Authorization: Bearer <token>
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  return undefined;
}

export function extractRefreshToken(request: NextRequest): string | undefined {
  return request.cookies.get(AUTH_CONFIG.REFRESH_COOKIE_NAME)?.value;
}

export async function requireAuth(
  request: NextRequest,
  allowedRoles?: "buyer" | "seller" | "admin" | Array<"buyer" | "seller" | "admin">,
): Promise<IUser> {
  const token = extractAuthToken(request);
  return authService.authenticateRequest(token, { requiredRole: allowedRoles });
}

export function attachSessionCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string; accessExpiresIn: number; refreshExpiresIn: number },
): void {
  const isProd = process.env.NODE_ENV === "production";

  // Access Token: HttpOnly, SameSite=Lax
  response.cookies.set(AUTH_CONFIG.COOKIE_NAME, tokens.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: tokens.accessExpiresIn,
  });

  // Refresh Token: HttpOnly, Path=/api/auth
  response.cookies.set(AUTH_CONFIG.REFRESH_COOKIE_NAME, tokens.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: tokens.refreshExpiresIn,
  });
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(AUTH_CONFIG.COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  response.cookies.set(AUTH_CONFIG.REFRESH_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}
