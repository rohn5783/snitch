import { randomBytes } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { getServerEnv } from "@/lib/server/config/env";
import { AppError } from "@/lib/server/errors/api-error";
import type { IUser } from "@/lib/server/models/user";
import { userRepository, type UserRepository } from "@/lib/server/repositories/user.repository";
import type { LoginInput, RegisterInput } from "@/lib/server/validators/auth.validator";

export interface PublicUser {
  id: string;
  email: string;
  contact?: string;
  fullname: string;
  role: "buyer" | "seller" | "admin";
  createdAt?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number; // in seconds
  refreshExpiresIn: number;
}

export interface AuthResult {
  user: PublicUser;
  tokens: TokenPair;
}

export class AuthService {
  constructor(private readonly userRepo: UserRepository = userRepository) {}

  public formatUser(user: IUser): PublicUser {
    return {
      id: user._id.toString(),
      email: user.email,
      contact: user.contact,
      fullname: user.fullname,
      role: user.role,
      createdAt: user.createdAt?.toISOString(),
    };
  }

  public generateTokenPair(user: IUser): TokenPair {
    const env = getServerEnv();
    const userId = user._id.toString();

    // Short-lived access token: 15 minutes
    const accessToken = jwt.sign(
      {
        id: userId,
        email: user.email,
        role: user.role,
        type: "access",
      },
      env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    // Long-lived cryptographically random refresh token
    const refreshToken = `${userId}.${randomBytes(32).toString("hex")}`;

    return {
      accessToken,
      refreshToken,
      accessExpiresIn: 15 * 60,
      refreshExpiresIn: 30 * 24 * 60 * 60,
    };
  }

  public verifyAccessToken(token: string): { id: string; email?: string; role?: string } {
    const env = getServerEnv();
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
      if (typeof decoded !== "object" || !decoded.id) {
        throw AppError.unauthorized("Invalid access token structure");
      }
      return {
        id: decoded.id as string,
        email: decoded.email as string | undefined,
        role: decoded.role as string | undefined,
      };
    } catch {
      throw AppError.unauthorized("Access token has expired or is invalid");
    }
  }

  async register(
    input: RegisterInput,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<AuthResult> {
    const existing = await this.userRepo.findByEmailOrContact(input.email, input.contact);
    if (existing) {
      throw AppError.conflict("User with this email or contact already exists");
    }

    const role = input.role || (input.isSeller ? "seller" : "buyer");

    const user = await this.userRepo.create({
      email: input.email,
      fullname: input.fullname,
      contact: input.contact,
      password: input.password,
      role,
    });

    const tokens = this.generateTokenPair(user);
    const expiresAt = new Date(Date.now() + tokens.refreshExpiresIn * 1000);
    await this.userRepo.addRefreshToken(user._id.toString(), tokens.refreshToken, expiresAt, meta);

    return {
      user: this.formatUser(user),
      tokens,
    };
  }

  async login(
    input: LoginInput,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<AuthResult> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      throw AppError.badRequest("Invalid email or password");
    }

    if (user.isSuspended) {
      throw AppError.forbidden("Your account has been suspended. Please contact support.");
    }

    const isValid = await user.comparePassword(input.password);
    if (!isValid) {
      throw AppError.badRequest("Invalid email or password");
    }

    const tokens = this.generateTokenPair(user);
    const expiresAt = new Date(Date.now() + tokens.refreshExpiresIn * 1000);
    await this.userRepo.addRefreshToken(user._id.toString(), tokens.refreshToken, expiresAt, meta);

    return {
      user: this.formatUser(user),
      tokens,
    };
  }

  async refresh(
    refreshToken: string,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<AuthResult> {
    if (!refreshToken) {
      throw AppError.unauthorized("Refresh token is required");
    }

    const result = await this.userRepo.findUserByRefreshToken(refreshToken);
    if (!result) {
      // Possible token replay attack: revoke if user id can be extracted
      const [possibleUserId] = refreshToken.split(".");
      if (possibleUserId && possibleUserId.length === 24) {
        await this.userRepo.clearAllRefreshTokens(possibleUserId);
      }
      throw AppError.unauthorized("Invalid or expired session. Please log in again.");
    }

    const { user } = result;

    if (user.isSuspended) {
      throw AppError.forbidden("Account is suspended");
    }

    // Token rotation: remove old refresh token, issue new token pair
    await this.userRepo.removeRefreshToken(user._id.toString(), refreshToken);

    const tokens = this.generateTokenPair(user);
    const expiresAt = new Date(Date.now() + tokens.refreshExpiresIn * 1000);
    await this.userRepo.addRefreshToken(user._id.toString(), tokens.refreshToken, expiresAt, meta);

    return {
      user: this.formatUser(user),
      tokens,
    };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.userRepo.removeRefreshToken(userId, refreshToken);
    } else {
      await this.userRepo.clearAllRefreshTokens(userId);
    }
  }

  async getMe(userId: string): Promise<PublicUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw AppError.notFound("User not found");
    }
    if (user.isSuspended) {
      throw AppError.forbidden("Account is suspended");
    }
    return this.formatUser(user);
  }

  async authenticateRequest(
    requestToken?: string,
    options?: { requiredRole?: "buyer" | "seller" | "admin" | Array<"buyer" | "seller" | "admin"> },
  ): Promise<IUser> {
    if (!requestToken) {
      throw AppError.unauthorized("Authentication required");
    }

    const { id } = this.verifyAccessToken(requestToken);
    const user = await this.userRepo.findById(id);

    if (!user) {
      throw AppError.unauthorized("Account does not exist");
    }

    if (user.isSuspended) {
      throw AppError.forbidden("Account is suspended");
    }

    if (options?.requiredRole) {
      const allowedRoles = Array.isArray(options.requiredRole)
        ? options.requiredRole
        : [options.requiredRole];
      if (!allowedRoles.includes(user.role)) {
        throw AppError.forbidden(`Access restricted to ${allowedRoles.join(" or ")} accounts`);
      }
    }

    return user;
  }
}

export const authService = new AuthService();
