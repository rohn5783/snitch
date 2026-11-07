import { Types } from "mongoose";
import { connectDB } from "@/lib/server/database/connection";
import { AppError } from "@/lib/server/errors/api-error";
import Coupon, { type ICoupon } from "@/lib/server/models/coupon";

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  discountType: "percentage" | "fixed";
  discountAmount: number;
  finalAmount: number;
  message: string;
}

export class CouponService {
  async validateCoupon(
    code: string,
    userId: string,
    orderAmount: number,
  ): Promise<CouponValidationResult> {
    if (!code) {
      throw AppError.badRequest("Coupon code is required");
    }

    await connectDB();
    const coupon = await Coupon.findOne({
      code: code.trim().toUpperCase(),
      isActive: true,
    });

    if (!coupon) {
      throw AppError.notFound("Invalid or expired coupon code");
    }

    if (new Date() > coupon.expiresAt) {
      throw AppError.badRequest("This coupon code has expired");
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      throw AppError.badRequest("This coupon has reached its maximum redemption limit");
    }

    if (orderAmount < coupon.minOrderAmount) {
      throw AppError.badRequest(
        `This coupon requires a minimum purchase of ₹${coupon.minOrderAmount}`,
      );
    }

    const userUsage = coupon.usedBy.find((u) => u.user.toString() === userId);
    if (userUsage && userUsage.count >= coupon.perUserLimit) {
      throw AppError.badRequest("You have already used this coupon code");
    }

    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = (orderAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    discountAmount = Math.min(orderAmount, Math.round(discountAmount));
    const finalAmount = Math.max(0, orderAmount - discountAmount);

    return {
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountAmount,
      finalAmount,
      message: `Coupon applied: ₹${discountAmount} discount`,
    };
  }

  async markCouponUsed(code: string, userId: string): Promise<void> {
    await connectDB();
    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase() });
    if (!coupon) return;

    coupon.usedCount += 1;
    const userUsage = coupon.usedBy.find((u) => u.user.toString() === userId);
    if (userUsage) {
      userUsage.count += 1;
    } else {
      coupon.usedBy.push({
        user: new Types.ObjectId(userId),
        count: 1,
      });
    }
    await coupon.save();
  }

  async createCoupon(
    creatorId: string,
    role: "seller" | "admin",
    input: {
      code: string;
      discountType: "percentage" | "fixed";
      discountValue: number;
      minOrderAmount?: number;
      maxDiscount?: number;
      expiresAt: Date | string;
      usageLimit?: number;
      perUserLimit?: number;
    },
  ): Promise<ICoupon> {
    await connectDB();
    const code = input.code.trim().toUpperCase();

    const existing = await Coupon.findOne({ code });
    if (existing) {
      throw AppError.conflict("A coupon with this code already exists");
    }

    return Coupon.create({
      code,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrderAmount: input.minOrderAmount || 0,
      maxDiscount: input.maxDiscount,
      expiresAt: new Date(input.expiresAt),
      usageLimit: input.usageLimit || 500,
      perUserLimit: input.perUserLimit || 1,
      creator: new Types.ObjectId(creatorId),
      isActive: true,
    });
  }
}

export const couponService = new CouponService();

