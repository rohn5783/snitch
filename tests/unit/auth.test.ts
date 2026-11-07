import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { AuthService } from "@/lib/server/services/auth.service";
import { loginSchema, registerSchema } from "@/lib/server/validators/auth.validator";
import type { IUser } from "@/lib/server/models/user";

describe("Unit: Authentication & Security Utilities", () => {
  const authService = new AuthService();

  it("hashes password with bcrypt and verifies candidate password accurately", async () => {
    const rawPassword = "StrongPassword123!";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const isMatch = await bcrypt.compare(rawPassword, hashedPassword);
    const isWrongMatch = await bcrypt.compare("WrongPassword!", hashedPassword);

    expect(isMatch).toBe(true);
    expect(isWrongMatch).toBe(false);
  });

  it("generates short-lived access token and random refresh token pair", () => {
    const mockUser = {
      _id: { toString: () => "507f1f77bcf86cd799439011" },
      email: "buyer@snitch.co",
      role: "buyer" as const,
    } as unknown as IUser;

    const tokens = authService.generateTokenPair(mockUser);

    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();
    expect(tokens.accessExpiresIn).toBe(15 * 60); // 15 mins
    expect(tokens.refreshToken).toContain("507f1f77bcf86cd799439011");

    const decoded = authService.verifyAccessToken(tokens.accessToken);
    expect(decoded.id).toBe("507f1f77bcf86cd799439011");
    expect(decoded.role).toBe("buyer");
  });

  it("formats public user securely without exposing password or refreshTokens", () => {
    const mockUser = {
      _id: { toString: () => "507f1f77bcf86cd799439011" },
      email: "designer@snitch.co",
      contact: "9876543210",
      fullname: "John Designer",
      role: "seller" as const,
      password: "secret-hashed-password",
      refreshTokens: [{ tokenHash: "hash" }],
      createdAt: new Date("2026-01-01"),
    } as unknown as IUser;

    const publicUser = authService.formatUser(mockUser);

    expect(publicUser.id).toBe("507f1f77bcf86cd799439011");
    expect(publicUser.email).toBe("designer@snitch.co");
    expect(publicUser.fullname).toBe("John Designer");
    expect(publicUser.role).toBe("seller");
    expect((publicUser as Record<string, unknown>).password).toBeUndefined();
    expect((publicUser as Record<string, unknown>).refreshTokens).toBeUndefined();
  });

  it("validates registration schema and rejects malformed contacts or short passwords", () => {
    const validData = {
      fullname: "Siddharth Roy",
      email: "siddharth@example.com",
      contact: "9876543210",
      password: "SafePassword123",
      isSeller: false,
    };
    expect(registerSchema.safeParse(validData).success).toBe(true);

    const invalidEmail = { ...validData, email: "invalid-email" };
    expect(registerSchema.safeParse(invalidEmail).success).toBe(false);

    const invalidContact = { ...validData, contact: "12345" }; // Not 10 digits
    expect(registerSchema.safeParse(invalidContact).success).toBe(false);

    const shortPassword = { ...validData, password: "123" };
    expect(registerSchema.safeParse(shortPassword).success).toBe(false);
  });

  it("validates login schema and enforces email and password presence", () => {
    expect(loginSchema.safeParse({ email: "user@snitch.co", password: "pwd" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "not-an-email", password: "pwd" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "user@snitch.co", password: "" }).success).toBe(false);
  });
});

