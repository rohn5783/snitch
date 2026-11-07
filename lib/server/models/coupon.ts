import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ICouponUsage {
  user: mongoose.Types.ObjectId;
  count: number;
}

export interface ICoupon extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  expiresAt: Date;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  usedBy: ICouponUsage[];
  isActive: boolean;
  creator: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true, min: 1 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    expiresAt: { type: Date, required: true, index: true },
    usageLimit: { type: Number, default: 500, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 1, min: 1 },
    usedBy: [
      {
        user: { type: Schema.Types.ObjectId, ref: "user", required: true },
        count: { type: Number, default: 1 },
      },
    ],
    isActive: { type: Boolean, default: true, index: true },
    creator: { type: Schema.Types.ObjectId, ref: "user", required: true },
  },
  { timestamps: true },
);

couponSchema.index({ code: 1, isActive: 1 });

const Coupon = (mongoose.models.coupon as Model<ICoupon>) ?? mongoose.model<ICoupon>("coupon", couponSchema);
export default Coupon;

