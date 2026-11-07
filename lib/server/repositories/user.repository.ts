import { createHash } from "node:crypto";
import { connectDB } from "@/lib/server/database/connection";
import User, { type IUser } from "@/lib/server/models/user";

export class UserRepository {
  async findById(id: string): Promise<IUser | null> {
    await connectDB();
    return User.findById(id);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    await connectDB();
    return User.findOne({ email: email.toLowerCase().trim() });
  }

  async findByGoogleId(googleId: string): Promise<IUser | null> {
    await connectDB();
    return User.findOne({ googleId });
  }

  async findByEmailOrContact(email: string, contact: string): Promise<IUser | null> {
    await connectDB();
    return User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { contact }],
    });
  }

  async create(data: {
    email: string;
    fullname: string;
    contact?: string;
    password?: string;
    role?: "buyer" | "seller" | "admin";
    googleId?: string;
  }): Promise<IUser> {
    await connectDB();
    return User.create({
      ...data,
      email: data.email.toLowerCase().trim(),
    });
  }

  async update(id: string, updateData: Partial<IUser>): Promise<IUser | null> {
    await connectDB();
    return User.findByIdAndUpdate(id, { $set: updateData }, { new: true, runValidators: true });
  }

  async addRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
    meta?: { userAgent?: string; ip?: string },
  ): Promise<void> {
    await connectDB();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await User.findByIdAndUpdate(userId, {
      $push: {
        refreshTokens: {
          tokenHash,
          expiresAt,
          createdAt: new Date(),
          userAgent: meta?.userAgent,
          ip: meta?.ip,
        },
      },
      $set: { lastLoginAt: new Date() },
    });
  }

  async findUserByRefreshToken(token: string): Promise<{ user: IUser; tokenIndex: number } | null> {
    await connectDB();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      "refreshTokens.tokenHash": tokenHash,
      "refreshTokens.expiresAt": { $gt: new Date() },
    });
    if (!user) return null;
    const tokenIndex = user.refreshTokens.findIndex((t) => t.tokenHash === tokenHash);
    return { user, tokenIndex };
  }

  async removeRefreshToken(userId: string, token: string): Promise<void> {
    await connectDB();
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await User.findByIdAndUpdate(userId, {
      $pull: { refreshTokens: { tokenHash } },
    });
  }

  async clearAllRefreshTokens(userId: string): Promise<void> {
    await connectDB();
    await User.findByIdAndUpdate(userId, {
      $set: { refreshTokens: [] },
    });
  }

  async count(filter: Record<string, unknown> = {}): Promise<number> {
    await connectDB();
    return User.countDocuments(filter);
  }

  async findMany(
    filter: Record<string, unknown> = {},
    options: { skip?: number; limit?: number; sort?: Record<string, 1 | -1> } = {},
  ): Promise<IUser[]> {
    await connectDB();
    return User.find(filter)
      .sort(options.sort || { createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 20)
      .select("-password -refreshTokens");
  }
}

export const userRepository = new UserRepository();
