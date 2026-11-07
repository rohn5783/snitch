import bcrypt from "bcryptjs";
import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IRefreshToken {
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent?: string;
  ip?: string;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  contact?: string;
  password?: string;
  fullname: string;
  role: "buyer" | "seller" | "admin";
  googleId?: string;
  isActive: boolean;
  isSuspended: boolean;
  lastLoginAt?: Date;
  refreshTokens: IRefreshToken[];
  comparePassword(candidate: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const refreshTokenSchema = new Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    userAgent: { type: String },
    ip: { type: String },
  },
  { _id: true },
);

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    contact: { type: String, trim: true },
    password: {
      type: String,
      required: function (this: { googleId?: string }) {
        return !this.googleId;
      },
    },
    fullname: { type: String, required: true, trim: true },
    role: { type: String, enum: ["buyer", "seller", "admin"], default: "buyer", index: true },
    googleId: { type: String, sparse: true, index: true },
    isActive: { type: Boolean, default: true },
    isSuspended: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    refreshTokens: [refreshTokenSchema],
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

// Compile model safely in Next.js development HMR
const User = (mongoose.models.user as Model<IUser>) ?? mongoose.model<IUser>("user", userSchema);
export default User;
