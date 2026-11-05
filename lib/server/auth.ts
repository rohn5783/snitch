import jwt, { type JwtPayload } from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ApiError } from "@/lib/server/errors";
import { requiredEnv } from "@/lib/server/env";
import { connectDB } from "@/lib/server/db";
import User from "@/lib/server/models/user";

type UserRecord = {
  _id: { toString(): string };
  email: string;
  contact?: string;
  fullname: string;
  role: "buyer" | "seller";
};

export function publicUser(user: UserRecord) {
  return {
    id: user._id.toString(),
    email: user.email,
    contact: user.contact,
    fullname: user.fullname,
    role: user.role,
  };
}

export function createSessionToken(userId: string) {
  return jwt.sign({ id: userId }, requiredEnv("JWT_SECRET"), { expiresIn: "7d" });
}

export async function authenticate(request: NextRequest, sellerOnly = false) {
  const token = request.cookies.get("token")?.value;
  if (!token) throw new ApiError("Unauthorized", 401);

  let decoded: string | JwtPayload;
  try {
    decoded = jwt.verify(token, requiredEnv("JWT_SECRET"));
  } catch {
    throw new ApiError("Unauthorized", 401);
  }

  if (typeof decoded === "string" || typeof decoded.id !== "string") {
    throw new ApiError("Unauthorized", 401);
  }

  await connectDB();
  const user = await User.findById(decoded.id);
  if (!user) throw new ApiError("Unauthorized", 401);
  if (sellerOnly && user.role !== "seller") throw new ApiError("Forbidden", 403);
  return user;
}

export function sessionResponse(user: UserRecord, message: string) {
  const token = createSessionToken(user._id.toString());
  const response = NextResponse.json({ message, success: true, user: publicUser(user) });
  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return response;
}
