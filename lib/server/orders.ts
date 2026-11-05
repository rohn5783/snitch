import mongoose, { Types } from "mongoose";
import type { NextRequest } from "next/server";
import { authenticate } from "@/lib/server/auth";
import { connectDB } from "@/lib/server/db";
import { ApiError, readJson } from "@/lib/server/errors";
import Payment from "@/lib/server/models/payment";
import Product from "@/lib/server/models/product";

type OrderItem = {
  sellerId?: Types.ObjectId;
  productId: Types.ObjectId;
  price?: { amount?: number };
  quantity?: number;
  fulfillmentStatus?: string;
  toObject: () => Record<string, unknown>;
};

export async function getUserOrders(request: NextRequest) {
  const user = await authenticate(request);
  const orders = await Payment.find({ user: user._id }).sort({ createdAt: -1 });
  return Response.json({ message: "Orders fetched successfully", success: true, orders });
}

export async function getSellerOrders(request: NextRequest) {
  const seller = await authenticate(request, true);
  await connectDB();
  const products = await Product.find({ seller: seller._id }).select("_id");
  const productIds = new Set(products.map((product) => product._id.toString()));
  if (!productIds.size) {
    return Response.json({ message: "Seller orders fetched successfully", success: true, orders: [] });
  }

  const orders = await Payment.find({
    status: "paid",
    "orderItems.productId": { $in: Array.from(productIds) },
  }).populate("user", "fullname email contact").sort({ createdAt: -1 });

  const sellerOrders = orders.map((order) => {
    const items = order.orderItems as unknown as OrderItem[];
    const ownedItems = items
      .filter((item) => item.sellerId
        ? item.sellerId.toString() === seller._id.toString()
        : productIds.has(item.productId.toString()));
    const orderItems = ownedItems.map((item) => ({
      ...item.toObject(),
      fulfillmentStatus: item.fulfillmentStatus || "pending",
    }));
    const sellerTotal = ownedItems.reduce(
      (total, item) => total + (Number(item.price?.amount) || 0) * (Number(item.quantity) || 0),
      0,
    );
    return {
      _id: order._id,
      createdAt: order.createdAt,
      razorpay: order.razorpay,
      paymentStatus: order.status,
      buyer: order.user,
      orderItems,
      sellerTotal,
      currency: order.price.currency,
      fulfillmentStatus: orderItems.length > 0 && orderItems.every((item) => item.fulfillmentStatus === "complete")
        ? "complete"
        : "pending",
    };
  }).filter((order) => order.orderItems.length > 0);

  return Response.json({ message: "Seller orders fetched successfully", success: true, orders: sellerOrders });
}

export async function updateSellerOrderStatus(request: NextRequest, orderId: string) {
  const seller = await authenticate(request, true);
  const body = await readJson(request);
  const status = body.status;
  if (status !== "pending" && status !== "complete") {
    throw new ApiError("Status must be either pending or complete", 400);
  }
  if (!Types.ObjectId.isValid(orderId)) throw new ApiError("Invalid order ID", 400);
  await connectDB();

  const products = await Product.find({ seller: seller._id }).select("_id");
  const productIds = new Set(products.map((product) => product._id.toString()));
  const order = await Payment.findOne({ _id: orderId, status: "paid" });
  if (!order) throw new ApiError("Paid order not found", 404);

  const ownedItems = (order.orderItems as unknown as OrderItem[]).filter((item) => item.sellerId
    ? item.sellerId.toString() === seller._id.toString()
    : productIds.has(item.productId.toString()));
  if (!ownedItems.length) throw new ApiError("Order does not contain your products", 404);

  for (const item of ownedItems) {
    if (!item.sellerId) item.sellerId = new mongoose.Types.ObjectId(seller._id);
    item.fulfillmentStatus = status;
  }
  await order.save();
  return Response.json({ message: "Order fulfillment status updated", success: true, status });
}
