import mongoose, { Types } from "mongoose";
import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/server/database/connection";
import { AppError } from "@/lib/server/errors/api-error";
import { readJson } from "@/lib/server/errors/index";
import { requireAuth } from "@/lib/server/middleware/auth-guard";
import { standardResponse } from "@/lib/server/middleware/request-context";
import Payment from "@/lib/server/models/payment";
import Product from "@/lib/server/models/product";

const fulfillmentSteps = ["pending", "processing", "ready", "dispatched", "delivered"] as const;
type FulfillmentStatus = (typeof fulfillmentSteps)[number];

function normalizedStatus(status?: string): FulfillmentStatus {
  if (status === "complete") return "delivered";
  return fulfillmentSteps.includes(status as FulfillmentStatus) ? (status as FulfillmentStatus) : "pending";
}

export async function getUserOrders(request: NextRequest) {
  const user = await requireAuth(request);
  await connectDB();

  const orders = await Payment.find({ user: user._id }).sort({ createdAt: -1 });

  return standardResponse(
    { orders },
    {
      message: "Orders fetched successfully",
      extra: { orders },
    },
  );
}

export async function getSellerOrders(request: NextRequest) {
  const seller = await requireAuth(request, "seller");
  await connectDB();

  const products = await Product.find({ seller: seller._id }).select("_id");
  const productIds = new Set(products.map((p) => p._id.toString()));

  if (!productIds.size) {
    return standardResponse(
      { orders: [] },
      {
        message: "Seller orders fetched successfully",
        extra: { orders: [] },
      },
    );
  }

  const orders = await Payment.find({
    status: { $in: ["paid", "CAPTURED"] },
    "orderItems.productId": { $in: Array.from(productIds) },
  })
    .populate("user", "fullname email contact")
    .sort({ createdAt: -1 });

  const sellerOrders = orders
    .map((order) => {
      const items = order.orderItems;
      const ownedItems = items.filter((item) =>
        item.sellerId
          ? item.sellerId.toString() === seller._id.toString()
          : productIds.has(item.productId.toString()),
      );

      const orderItems = ownedItems.map((item) => ({
        ...item.toObject(),
        fulfillmentStatus: normalizedStatus(item.fulfillmentStatus),
      }));

      const sellerTotal = ownedItems.reduce(
        (total, item) => total + (Number(item.price?.amount) || 0) * (Number(item.quantity) || 0),
        0,
      );

      const statuses = [...new Set(orderItems.map((item) => normalizedStatus(item.fulfillmentStatus)))];
      const overallFulfillmentStatus = statuses.length === 1 ? statuses[0] : "processing";

      return {
        _id: order._id,
        createdAt: order.createdAt,
        razorpay: order.razorpay,
        paymentStatus: order.status,
        buyer: order.user,
        shippingAddress: order.shippingAddress,
        orderItems,
        sellerTotal,
        currency: order.price.currency,
        fulfillmentStatus: overallFulfillmentStatus,
      };
    })
    .filter((order) => order.orderItems.length > 0);

  return standardResponse(
    { orders: sellerOrders },
    {
      message: "Seller orders fetched successfully",
      extra: { orders: sellerOrders },
    },
  );
}

export async function updateSellerOrderStatus(request: NextRequest, orderId: string) {
  const seller = await requireAuth(request, "seller");
  const body = await readJson(request);
  const status = body.status as string;
  const itemId = typeof body.itemId === "string" ? body.itemId : "";

  if (!fulfillmentSteps.includes(status as FulfillmentStatus) || status === "pending") {
    throw AppError.badRequest("Choose a valid next order fulfillment step");
  }

  const fulfillmentStatus = status as FulfillmentStatus;
  if (!Types.ObjectId.isValid(itemId)) throw AppError.badRequest("Invalid order item ID");
  if (!Types.ObjectId.isValid(orderId)) throw AppError.badRequest("Invalid order ID");

  await connectDB();
  const products = await Product.find({ seller: seller._id }).select("_id");
  const productIds = new Set(products.map((p) => p._id.toString()));

  const order = await Payment.findOne({
    _id: orderId,
    status: { $in: ["paid", "CAPTURED"] },
  });

  if (!order) {
    throw AppError.notFound("Paid order not found");
  }

  const ownedItems = order.orderItems.filter((item) =>
    item.sellerId
      ? item.sellerId.toString() === seller._id.toString()
      : productIds.has(item.productId.toString()),
  );

  if (!ownedItems.length) {
    throw AppError.notFound("Order does not contain your products");
  }

  const item = ownedItems.find((entry: { _id?: { toString(): string } }) => entry._id?.toString() === itemId);
  if (!item) {
    throw AppError.notFound("Order item not found");
  }

  const currentIndex = fulfillmentSteps.indexOf(normalizedStatus(item.fulfillmentStatus));
  if (fulfillmentSteps[currentIndex + 1] !== fulfillmentStatus) {
    throw AppError.conflict(
      `Order item must move to ${fulfillmentSteps[currentIndex + 1] ?? "delivered"} next`,
    );
  }

  if (!item.sellerId) {
    item.sellerId = new mongoose.Types.ObjectId(seller._id);
  }
  item.fulfillmentStatus = fulfillmentStatus;

  // If all items are delivered, set order-level fulfillmentStatus
  const allDelivered = order.orderItems.every(
    (i) => i.fulfillmentStatus === "delivered" || i.fulfillmentStatus === "complete",
  );
  if (allDelivered) {
    order.fulfillmentStatus = "delivered";
  }

  await order.save();

  return standardResponse(
    { status: fulfillmentStatus },
    {
      message: "Order fulfillment status updated",
      extra: { status: fulfillmentStatus },
    },
  );
}
