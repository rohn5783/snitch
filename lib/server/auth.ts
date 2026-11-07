import { NextResponse, type NextRequest } from "next/server";
import type { IUser } from "@/lib/server/models/user";
import { authService, type PublicUser } from "@/lib/server/services/auth.service";
import { attachSessionCookies, requireAuth } from "./middleware/auth-guard";

export type UserRecord = IUser | {
  _id: { toString(): string };
  email: string;
  contact?: string;
  fullname: string;
  role: "buyer" | "seller" | "admin";
};

export function publicUser(user: UserRecord): PublicUser {
  return {
    id: user._id.toString(),
    email: user.email,
    contact: user.contact,
    fullname: user.fullname,
    role: user.role,
  };
}

export function createSessionToken(userId: string): string {
  // Generates token for compatibility
  const user = { _id: { toString: () => userId }, email: "", role: "buyer" as const };
  const tokens = authService.generateTokenPair(user as unknown as IUser);
  return tokens.accessToken;
}

export async function authenticate(request: NextRequest, sellerOnly = false): Promise<IUser> {
  return requireAuth(request, sellerOnly ? "seller" : undefined);
}

export function sessionResponse(user: UserRecord, message: string): NextResponse {
  const typedUser = user as IUser;
  const tokens = authService.generateTokenPair(typedUser);
  const response = NextResponse.json({
    message,
    success: true,
    user: publicUser(user),
  });
  attachSessionCookies(response, tokens);
  return response;
}

export * from "./middleware/auth-guard";
