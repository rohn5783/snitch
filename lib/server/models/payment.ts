import mongoose, { Schema } from "mongoose";

const priceSchema = new Schema({
  amount: { type: Number, required: true },
  currency: { type: String, enum: ["USD", "EUR", "GBP", "JPY", "INR"], default: "INR" },
}, { _id: false });

const paymentSchema = new Schema({
  status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
  price: { type: priceSchema, required: true },
  razorpay: { orderId: String, paymentId: String, signature: String },
  user: { type: Schema.Types.ObjectId, ref: "user", required: true },
  shippingAddress: {
    fullName: String,
    phone: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  orderItems: [{
    title: String,
    productId: Schema.Types.ObjectId,
    sellerId: Schema.Types.ObjectId,
    variantId: Schema.Types.ObjectId,
    quantity: Number,
    fulfillmentStatus: { type: String, enum: ["pending", "processing", "ready", "dispatched", "delivered", "complete"], default: "pending" },
    images: [{ url: String }],
    description: String,
    price: priceSchema,
  }],
}, { timestamps: true });

const Payment = mongoose.models.payment ?? mongoose.model("payment", paymentSchema);
export default Payment;
