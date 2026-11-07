import { randomUUID } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { NextResponse, type NextRequest } from "next/server";
import { getServerEnv } from "@/lib/server/config/env";
import { AppError } from "@/lib/server/errors/api-error";
import { readJson } from "@/lib/server/errors/index";
import { logger } from "@/lib/server/logger/logger";
import { attachSessionCookies, clearSessionCookies, extractAuthToken, extractRefreshToken, requireAuth } from "@/lib/server/middleware/auth-guard";
import { assertRateLimit, getClientIp } from "@/lib/server/middleware/rate-limiter";
import { getRequestContext, standardResponse } from "@/lib/server/middleware/request-context";
import { userRepository } from "@/lib/server/repositories/user.repository";
import { authService } from "@/lib/server/services/auth.service";
import { loginSchema, registerSchema } from "@/lib/server/validators/auth.validator";

export async function register(request: NextRequest) {
  const { correlationId, logger: reqLogger } = getRequestContext(request);

  // Rate limit: 10 registrations per 15 minutes per IP
  await assertRateLimit(request, {
    windowSeconds: 900,
    maxRequests: 15,
    prefix: "rl:reg",
  });

  const rawBody = await readJson(request);
  const parseResult = registerSchema.safeParse(rawBody);
  if (!parseResult.success) {
    throw AppError.validation("Invalid registration data", parseResult.error.flatten().fieldErrors);
  }

  const meta = {
    userAgent: request.headers.get("user-agent") || undefined,
    ip: getClientIp(request),
  };

  const { user, tokens } = await authService.register(parseResult.data, meta);
  reqLogger.info("User registered successfully", { userId: user.id, role: user.role });

  const response = standardResponse(
    { user },
    {
      message: "User registered successfully",
      status: 201,
      correlationId,
      extra: { user },
    },
  );
  attachSessionCookies(response, tokens);
  return response;
}

export async function login(request: NextRequest) {
  const { correlationId, logger: reqLogger } = getRequestContext(request);

  // Brute force protection: 10 attempts per 10 minutes per IP
  await assertRateLimit(request, {
    windowSeconds: 600,
    maxRequests: 10,
    prefix: "rl:login",
  });

  const rawBody = await readJson(request);
  const parseResult = loginSchema.safeParse(rawBody);
  if (!parseResult.success) {
    throw AppError.validation("Invalid login credentials", parseResult.error.flatten().fieldErrors);
  }

  const meta = {
    userAgent: request.headers.get("user-agent") || undefined,
    ip: getClientIp(request),
  };

  const { user, tokens } = await authService.login(parseResult.data, meta);
  reqLogger.info("User logged in successfully", { userId: user.id });

  const response = standardResponse(
    { user },
    {
      message: "User logged in successfully",
      correlationId,
      extra: { user },
    },
  );
  attachSessionCookies(response, tokens);
  return response;
}

export async function refreshToken(request: NextRequest) {
  const { correlationId } = getRequestContext(request);
  const token = extractRefreshToken(request);
  if (!token) {
    throw AppError.unauthorized("Refresh token not found");
  }

  const meta = {
    userAgent: request.headers.get("user-agent") || undefined,
    ip: getClientIp(request),
  };

  const { user, tokens } = await authService.refresh(token, meta);

  const response = standardResponse(
    { user },
    {
      message: "Session refreshed successfully",
      correlationId,
      extra: { user },
    },
  );
  attachSessionCookies(response, tokens);
  return response;
}

export async function getMe(request: NextRequest) {
  const { correlationId } = getRequestContext(request);
  const user = await requireAuth(request);
  const formatted = authService.formatUser(user);

  return standardResponse(
    { user: formatted },
    {
      message: "User fetched successfully",
      correlationId,
      extra: { user: formatted },
    },
  );
}

export async function logout(request?: NextRequest) {
  const response = standardResponse(
    {},
    { message: "User logged out successfully" },
  );

  if (request) {
    const token = extractRefreshToken(request);
    const authToken = extractAuthToken(request);
    if (authToken) {
      try {
        const { id } = authService.verifyAccessToken(authToken);
        await authService.logout(id, token);
      } catch {
        // Silently continue clearing cookies
      }
    }
  }

  clearSessionCookies(response);
  return response;
}

function googleCallbackUrl(request: NextRequest) {
  const configured = getServerEnv().GOOGLE_CALLBACK_URL;
  if (configured) return configured;
  return new URL("/auth/google/callback", request.nextUrl.origin).toString();
}

export function startGoogleOAuth(request: NextRequest) {
  const env = getServerEnv();
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw AppError.serviceUnavailable("Google OAuth is not configured on this server");
  }

  const callbackUrl = googleCallbackUrl(request);
  const state = jwt.sign({ nonce: randomUUID() }, env.JWT_SECRET, { expiresIn: "10m" });

  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.searchParams.set("client_id", clientId);
  googleUrl.searchParams.set("redirect_uri", callbackUrl);
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", "openid email profile");
  googleUrl.searchParams.set("state", state);
  googleUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(googleUrl);
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}

export async function finishGoogleOAuth(request: NextRequest) {
  const env = getServerEnv();
  try {
    const state = request.nextUrl.searchParams.get("state");
    const code = request.nextUrl.searchParams.get("code");
    const stateCookie = request.cookies.get("google_oauth_state")?.value;

    if (!state || !stateCookie || state !== stateCookie || !code) {
      throw AppError.badRequest("Google sign-in state could not be verified");
    }

    const verifiedState = jwt.verify(state, env.JWT_SECRET) as JwtPayload;
    if (typeof verifiedState.nonce !== "string") {
      throw AppError.badRequest("Invalid Google sign-in state");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: googleCallbackUrl(request),
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      throw AppError.unauthorized("Google authorization code exchange failed");
    }

    const tokens = (await tokenResponse.json()) as { access_token?: string };
    if (!tokens.access_token) {
      throw AppError.unauthorized("Google did not return an access token");
    }

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: "no-store",
    });

    if (!profileResponse.ok) {
      throw AppError.unauthorized("Could not retrieve Google profile");
    }

    const profile = (await profileResponse.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    };

    if (!profile.sub || !profile.email || !profile.email_verified) {
      throw AppError.unauthorized("A verified Google email address is required");
    }

    const email = profile.email.toLowerCase().trim();
    let user = await userRepository.findByEmail(email);

    if (user) {
      // Secure account linking: attach googleId if not present
      if (!user.googleId) {
        user.googleId = profile.sub;
        await user.save();
        logger.info("Linked Google OAuth to existing email account", { userId: user._id.toString() });
      }
    } else {
      user = await userRepository.create({
        email,
        googleId: profile.sub,
        fullname: profile.name || email.split("@")[0],
        role: "buyer",
      });
      logger.info("Created new user via Google OAuth", { userId: user._id.toString() });
    }

    const sessionTokens = authService.generateTokenPair(user);
    const expiresAt = new Date(Date.now() + sessionTokens.refreshExpiresIn * 1000);
    await userRepository.addRefreshToken(user._id.toString(), sessionTokens.refreshToken, expiresAt, {
      userAgent: request.headers.get("user-agent") || undefined,
      ip: getClientIp(request),
    });

    const redirectUrl = new URL("/", request.nextUrl.origin);
    const response = NextResponse.redirect(redirectUrl);
    attachSessionCookies(response, sessionTokens);
    response.cookies.set("google_oauth_state", "", { httpOnly: true, path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    logger.error("Google OAuth authentication failed", error);
    const redirectUrl = new URL("/login?oauth_error=google", request.nextUrl.origin);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("google_oauth_state", "", { httpOnly: true, path: "/", maxAge: 0 });
    return response;
  }
}
