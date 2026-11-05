import jwt, { type JwtPayload } from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { connectDB } from "@/lib/server/db";
import { requiredEnv } from "@/lib/server/env";
import { authenticate, createSessionToken, publicUser, sessionResponse } from "@/lib/server/auth";
import { ApiError, readJson } from "@/lib/server/errors";
import User from "@/lib/server/models/user";

export async function register(request: NextRequest) {
  const body = await readJson(request);
  const fullname = typeof body.fullname === "string" ? body.fullname.trim() : "";
  const contact = typeof body.contact === "string" ? body.contact : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError("Invalid email format", 400);
  if (!/^\d{10}$/.test(contact)) throw new ApiError("Contact must be a 10-digit number", 400);
  if (password.length < 6) throw new ApiError("Password must be at least 6 characters long", 400);
  if (fullname.length < 3) throw new ApiError("Full name must be at least 3 characters long", 400);
  if (typeof body.isSeller !== "boolean") throw new ApiError("isSeller must be a boolean value", 400);

  await connectDB();
  const existingUser = await User.findOne({ $or: [{ email }, { contact }] });
  if (existingUser) throw new ApiError("User with this email or contact already exists", 400);
  const user = await User.create({ email, contact, password, fullname, role: body.isSeller ? "seller" : "buyer" });
  return sessionResponse(user, "User registered successfully");
}

export async function login(request: NextRequest) {
  const body = await readJson(request);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError("Invalid email format", 400);
  if (!password) throw new ApiError("Password is required", 400);

  await connectDB();
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) throw new ApiError("Invalid email or password", 400);
  return sessionResponse(user, "User logged in successfully");
}

export async function getMe(request: NextRequest) {
  const user = await authenticate(request);
  return Response.json({ message: "User fetched successfully", success: true, user: publicUser(user) });
}

export function logout() {
  const response = NextResponse.json({ message: "User logged out successfully", success: true });
  response.cookies.set("token", "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

export function startGoogleOAuth() {
  const clientId = requiredEnv("GOOGLE_CLIENT_ID");
  const callbackUrl = requiredEnv("GOOGLE_CALLBACK_URL");
  const state = jwt.sign({ nonce: randomUUID() }, requiredEnv("JWT_SECRET"), { expiresIn: "10m" });
  const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleUrl.searchParams.set("client_id", clientId);
  googleUrl.searchParams.set("redirect_uri", callbackUrl);
  googleUrl.searchParams.set("response_type", "code");
  googleUrl.searchParams.set("scope", "openid email profile");
  googleUrl.searchParams.set("state", state);

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
  try {
    const state = request.nextUrl.searchParams.get("state");
    const code = request.nextUrl.searchParams.get("code");
    const stateCookie = request.cookies.get("google_oauth_state")?.value;
    if (!state || !stateCookie || state !== stateCookie || !code) {
      throw new ApiError("Google sign-in could not be verified", 400);
    }

    const verifiedState = jwt.verify(state, requiredEnv("JWT_SECRET")) as JwtPayload;
    if (typeof verifiedState.nonce !== "string") throw new ApiError("Invalid Google sign-in state", 400);

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: requiredEnv("GOOGLE_CLIENT_ID"),
        client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
        redirect_uri: requiredEnv("GOOGLE_CALLBACK_URL"),
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) throw new ApiError("Google sign-in failed", 401);
    const tokens = await tokenResponse.json() as { access_token?: string };
    if (!tokens.access_token) throw new ApiError("Google did not return an access token", 401);

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: "no-store",
    });
    if (!profileResponse.ok) throw new ApiError("Could not retrieve your Google profile", 401);
    const profile = await profileResponse.json() as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
    };
    if (!profile.sub || !profile.email || !profile.email_verified) {
      throw new ApiError("A verified Google email address is required", 401);
    }

    await connectDB();
    let user = await User.findOne({ $or: [{ email: profile.email.toLowerCase() }, { googleId: profile.sub }] });
    if (!user) {
      user = await User.create({
        email: profile.email.toLowerCase(),
        googleId: profile.sub,
        fullname: profile.name || profile.email,
      });
    }

    const response = NextResponse.redirect(new URL("/", request.nextUrl.origin));
    response.cookies.set("token", createSessionToken(user._id.toString()), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    response.cookies.set("google_oauth_state", "", { httpOnly: true, path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("Google OAuth callback failed", error);
    const response = NextResponse.redirect(new URL("/login?oauth_error=google", request.nextUrl.origin));
    response.cookies.set("google_oauth_state", "", { httpOnly: true, path: "/", maxAge: 0 });
    return response;
  }
}
