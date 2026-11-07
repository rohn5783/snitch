import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IPrice {
  amount: number;
  currency: string;
}

export interface IShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface IOrderItem {
  _id?: mongoose.Types.ObjectId;
  title: string;
  productId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  variantId: mongoose.Types.ObjectId;
  quantity: number;
  fulfillmentStatus: "pending" | "processing" | "ready" | "dispatched" | "delivered" | "complete" | "cancelled";
  images: Array<{ url: string }>;
  description?: string;
  price: IPrice;
}

export interface IRefundRecord {
  refundId: string;
  amount: number;
  status: "pending" | "processed" | "failed";
  reason?: string;
  createdAt: Date;
}

export interface IPayment extends Document {
  _id: mongoose.Types.ObjectId;
  status: "pending" | "paid" | "failed" | "CREATED" | "PENDING" | "AUTHORIZED" | "CAPTURED" | "FAILED" | "CANCELLED" | "REFUNDED" | "PARTIALLY_REFUNDED";
  paymentStatus?: string;
  fulfillmentStatus: "pending" | "processing" | "ready" | "dispatched" | "delivered" | "cancelled";
  price: IPrice;
  razorpay: {
    orderId?: string;
    paymentId?: string;
    signature?: string;
  };
  user: mongoose.Types.ObjectId;
  shippingAddress: IShippingAddress;
  orderItems: mongoose.Types.DocumentArray<IOrderItem & mongoose.Types.Subdocument>;
  refunds: IRefundRecord[];
  processedWebhookEvents: string[];
  couponCode?: string;
  discountAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const priceSchema = new Schema<IPrice>(
  {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["USD", "EUR", "GBP", "JPY", "INR"], default: "INR" },
  },
  { _id: false },
);

const refundSchema = new Schema<IRefundRecord>(
  {
    refundId: { type: String, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "processed", "failed"], default: "pending" },
    reason: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const orderItemSchema = new Schema<IOrderItem>(
  {
    title: { type: String, required: true },
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "user", required: true, index: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true, min: 1 },
    fulfillmentStatus: {
      type: String,
      enum: ["pending", "processing", "ready", "dispatched", "delivered", "complete", "cancelled"],
      default: "pending",
    },
    images: [{ url: String }],
    description: String,
    price: { type: priceSchema, required: true },
  },
  { _id: true },
);

const paymentSchema = new Schema<IPayment>(
  {
    status: {
      type: String,
      default: "pending",
      index: true,
    },
    paymentStatus: { type: String },
    fulfillmentStatus: {
      type: String,
      enum: ["pending", "processing", "ready", "dispatched", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    price: { type: priceSchema, required: true },
    razorpay: {
      orderId: { type: String, index: true },
      paymentId: { type: String, index: true },
      signature: String,
    },
    user: { type: Schema.Types.ObjectId, ref: "user", required: true, index: true },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: String,
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
    },
    orderItems: [orderItemSchema],
    refunds: [refundSchema],
    processedWebhookEvents: [{ type: String, index: true }],
    couponCode: { type: String, uppercase: true, trim: true },
    discountAmount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Compound indexes for user orders and seller query performance
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ "razorpay.orderId": 1, user: 1 });
paymentSchema.index({ "orderItems.sellerId": 1, status: 1, createdAt: -1 });
paymentSchema.index({ "orderItems.productId": 1, createdAt: -1 });

const Payment = (mongoose.models.payment as Model<IPayment>) ?? mongoose.model<IPayment>("payment", paymentSchema);
export default Payment;
