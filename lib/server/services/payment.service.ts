import { Types } from "mongoose";
import { connectDB } from "@/lib/server/database/connection";
import { AppError } from "@/lib/server/errors/api-error";
import { getRazorpayClient, verifyPaymentSignature, verifyWebhookSignature } from "@/lib/server/integrations/razorpay/razorpay.client";
import { logger } from "@/lib/server/logger/logger";
import AuditLog from "@/lib/server/models/audit-log";
import Cart from "@/lib/server/models/cart";
import Payment, { type IShippingAddress } from "@/lib/server/models/payment";
import WebhookEvent from "@/lib/server/models/webhook-event";
import { inventoryService } from "@/lib/server/services/inventory.service";

interface CartDetails {
  _id: Types.ObjectId;
  items: Array<{
    _id?: Types.ObjectId;
    product: {
      _id: Types.ObjectId;
      title: string;
      description: string;
      seller: Types.ObjectId;
      isActive?: boolean;
      price: { amount: number; currency: string };
      images: Array<{ url: string }>;
      variants: Array<{
        _id: Types.ObjectId;
        stock: number;
        images: Array<{ url: string }>;
        attributes?: Map<string, string>;
        price?: { amount: number; currency: string };
      }>;
    };
    variant: {
      _id: Types.ObjectId;
      stock: number;
      images: Array<{ url: string }>;
      attributes?: Map<string, string>;
      price?: { amount: number; currency: string };
    };
    quantity: number;
  }>;
  totalPrice: number;
  currency: string;
}

export class PaymentService {
  async getCartDetails(userId: string | Types.ObjectId): Promise<CartDetails> {
    await connectDB();
    let cart = await Cart.findOne({ user: userId }).populate("items.product");
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    const cartRecord = cart.toObject() as unknown as {
      _id: Types.ObjectId;
      items: Array<{
        _id: Types.ObjectId;
        product: CartDetails["items"][0]["product"] | null;
        variant: Types.ObjectId;
        quantity: number;
        price: { amount: number; currency: string };
      }>;
    };

    let totalPrice = 0;
    let currency = "INR";
    let hasCurrency = false;

    const items: CartDetails["items"] = [];

    for (const item of cartRecord.items) {
      const product = item.product;
      if (!product) continue;
      const variant = product.variants?.find((opt) => opt._id.toString() === item.variant?.toString());
      if (!variant) continue;

      const unitPrice = variant.price ?? product.price;
      totalPrice += unitPrice.amount * item.quantity;
      if (!hasCurrency) {
        currency = unitPrice.currency;
        hasCurrency = true;
      }

      items.push({
        _id: item._id,
        product,
        variant,
        quantity: item.quantity,
      });
    }

    return {
      _id: cartRecord._id,
      items,
      totalPrice,
      currency,
    };
  }

  async createRazorpayOrder(
    userId: string | Types.ObjectId,
    shippingAddress: IShippingAddress,
    couponDiscount = 0,
  ): Promise<{ keyId: string; order: { id: string; amount: number; currency: string } }> {
    const cart = await this.getCartDetails(userId);
    if (!cart.items.length || cart.totalPrice <= 0) {
      throw AppError.badRequest("Cart is empty");
    }

    // Currency consistency check
    for (const item of cart.items) {
      const itemCurrency = item.variant.price?.currency ?? item.product.price.currency;
      if (itemCurrency !== cart.currency) {
        throw AppError.conflict("A shopping bag can only contain products in one currency.");
      }
      if (item.product.isActive === false) {
        throw AppError.conflict(`${item.product.title} is no longer available`);
      }
      if (item.variant.stock < item.quantity) {
        throw AppError.conflict(`Only ${item.variant.stock} of ${item.product.title} remain in stock`);
      }
    }

    const payableAmount = Math.max(1, cart.totalPrice - couponDiscount);
    const razorpay = getRazorpayClient();
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(payableAmount * 100),
      currency: cart.currency,
      receipt: `rcpt_${Date.now()}`,
    });

    // Reserve stock atomically for 10 minutes (600s)
    await inventoryService.reserveStock(
      razorpayOrder.id,
      userId.toString(),
      cart.items.map((i) => ({
        productId: i.product._id,
        variantId: i.variant._id,
        quantity: i.quantity,
      })),
      600,
    );

    // Create payment document
    await connectDB();
    await Payment.create({
      user: userId,
      status: "pending",
      paymentStatus: "PENDING",
      price: { amount: payableAmount, currency: cart.currency },
      razorpay: { orderId: razorpayOrder.id },
      shippingAddress,
      discountAmount: couponDiscount,
      orderItems: cart.items.map((item) => {
        const variantPrice = item.variant.price ?? item.product.price;
        return {
          title: item.product.title,
          productId: item.product._id,
          sellerId: item.product.seller,
          variantId: item.variant._id,
          quantity: item.quantity,
          fulfillmentStatus: "pending",
          images: item.variant.images?.length ? item.variant.images : item.product.images,
          description: item.product.description,
          price: { amount: variantPrice.amount, currency: variantPrice.currency },
        };
      }),
    });

    const env = process.env.RAZORPAY_KEY_ID || "";
    return {
      keyId: env,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount as number,
        currency: razorpayOrder.currency as string,
      },
    };
  }

  async verifyPayment(
    userId: string | Types.ObjectId,
    data: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
  ): Promise<{ message: string; success: boolean; alreadyProcessed?: boolean }> {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;

    const isValid = verifyPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      throw AppError.badRequest("Payment signature verification failed");
    }

    await connectDB();
    const payment = await Payment.findOne({
      "razorpay.orderId": razorpay_order_id,
      user: userId,
    });

    if (!payment) {
      throw AppError.notFound("Payment order not found");
    }

    // Idempotent payment check
    if (payment.status === "paid" || payment.status === "CAPTURED") {
      if (payment.razorpay?.paymentId && payment.razorpay.paymentId !== razorpay_payment_id) {
        throw AppError.conflict("Order was already paid with a different payment ID");
      }
      return { message: "Payment was already processed", success: true, alreadyProcessed: true };
    }

    // Commit inventory atomically
    await inventoryService.commitReservation(razorpay_order_id);

    // Clear cart items that were purchased
    const cart = await Cart.findOne({ user: userId });
    if (cart) {
      for (const purchased of payment.orderItems) {
        cart.items = cart.items.filter(
          (entry: { product: { toString(): string }; variant?: { toString(): string } }) =>
            !(
              entry.product.toString() === purchased.productId.toString() &&
              entry.variant?.toString() === purchased.variantId.toString()
            ),
        ) as unknown as typeof cart.items;
      }
      await cart.save();
    }

    payment.status = "paid";
    payment.paymentStatus = "CAPTURED";
    payment.razorpay.paymentId = razorpay_payment_id;
    payment.razorpay.signature = razorpay_signature;
    await payment.save();

    await AuditLog.create({
      entityType: "payment",
      entityId: payment._id.toString(),
      action: "PAYMENT_VERIFIED",
      actor: { userId: new Types.ObjectId(userId) },
      metadata: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        amount: payment.price.amount,
      },
    });

    logger.info("Payment verified and completed successfully", {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });

    return { message: "Payment verified and inventory updated", success: true };
  }

  async handleWebhook(rawBody: string, signature: string): Promise<{ handled: boolean; event: string }> {
    if (!verifyWebhookSignature(rawBody, signature)) {
      throw AppError.unauthorized("Invalid webhook signature");
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      throw AppError.badRequest("Invalid webhook payload JSON");
    }

    const eventName = payload.event as string;
    const eventId = (payload.id as string) || `evt_${Date.now()}`;

    await connectDB();
    const existing = await WebhookEvent.findOne({ eventId });
    if (existing && existing.processed) {
      logger.info("Webhook event already processed (idempotency)", { eventId, event: eventName });
      return { handled: true, event: eventName };
    }

    await WebhookEvent.create({
      eventId,
      event: eventName,
      payload,
      processed: false,
    });

    try {
      const eventPayload = payload.payload as Record<string, unknown> | undefined;
      const paymentObj = (eventPayload?.payment as Record<string, unknown> | undefined)?.entity as
        | Record<string, unknown>
        | undefined;
      const razorpayOrderId = paymentObj?.order_id as string | undefined;
      const razorpayPaymentId = paymentObj?.id as string | undefined;

      if (eventName === "payment.captured" && razorpayOrderId) {
        const paymentDoc = await Payment.findOne({ "razorpay.orderId": razorpayOrderId });
        if (paymentDoc && paymentDoc.status !== "paid") {
          await inventoryService.commitReservation(razorpayOrderId);
          paymentDoc.status = "paid";
          paymentDoc.paymentStatus = "CAPTURED";
          if (razorpayPaymentId) paymentDoc.razorpay.paymentId = razorpayPaymentId;
          paymentDoc.processedWebhookEvents.push(eventId);
          await paymentDoc.save();
          logger.info("Order marked paid via payment.captured webhook", { orderId: razorpayOrderId });
        }
      } else if (eventName === "payment.failed" && razorpayOrderId) {
        const paymentDoc = await Payment.findOne({ "razorpay.orderId": razorpayOrderId });
        if (paymentDoc && paymentDoc.status === "pending") {
          await inventoryService.releaseReservation(razorpayOrderId, "Razorpay payment failed webhook");
          paymentDoc.status = "failed";
          paymentDoc.paymentStatus = "FAILED";
          paymentDoc.processedWebhookEvents.push(eventId);
          await paymentDoc.save();
          logger.warn("Order marked failed and stock released via webhook", { orderId: razorpayOrderId });
        }
      }

      await WebhookEvent.updateOne({ eventId }, { $set: { processed: true, processedAt: new Date() } });
      return { handled: true, event: eventName };
    } catch (err) {
      await WebhookEvent.updateOne(
        { eventId },
        { $set: { error: err instanceof Error ? err.message : "Processing error" } },
      );
      throw err;
    }
  }

  async processRefund(
    orderId: string,
    operator: { userId: string; role: string },
    options: { amount?: number; reason?: string } = {},
  ): Promise<{ success: boolean; refundId: string; amount: number }> {
    await connectDB();
    const payment = await Payment.findOne({
      $or: [{ _id: Types.ObjectId.isValid(orderId) ? new Types.ObjectId(orderId) : null }, { "razorpay.orderId": orderId }],
      status: { $in: ["paid", "CAPTURED"] },
    });

    if (!payment) {
      throw AppError.notFound("Eligible paid order not found for refund");
    }

    // Role check: Seller can only refund their own order, Admin can refund any
    if (operator.role === "seller") {
      const hasSellerProduct = payment.orderItems.some(
        (item) => item.sellerId.toString() === operator.userId,
      );
      if (!hasSellerProduct) {
        throw AppError.forbidden("You do not have permission to refund this order");
      }
    }

    const refundAmount = options.amount || payment.price.amount;
    const razorpayPaymentId = payment.razorpay?.paymentId;
    let razorpayRefundId = `rfnd_${Date.now()}`;

    if (razorpayPaymentId) {
      try {
        const client = getRazorpayClient();
        const response = await client.payments.refund(razorpayPaymentId, {
          amount: Math.round(refundAmount * 100),
          notes: { reason: options.reason || "Customer requested refund" },
        });
        razorpayRefundId = (response as { id?: string }).id || razorpayRefundId;
      } catch (err) {
        logger.warn("Razorpay API refund call error, recording internal refund", { error: err });
      }
    }

    payment.refunds.push({
      refundId: razorpayRefundId,
      amount: refundAmount,
      status: "processed",
      reason: options.reason,
      createdAt: new Date(),
    });

    payment.status = refundAmount >= payment.price.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";
    payment.paymentStatus = payment.status;
    await payment.save();

    await AuditLog.create({
      entityType: "payment",
      entityId: payment._id.toString(),
      action: "PAYMENT_REFUNDED",
      actor: { userId: new Types.ObjectId(operator.userId), role: operator.role },
      metadata: {
        refundId: razorpayRefundId,
        amount: refundAmount,
        reason: options.reason,
      },
    });

    return { success: true, refundId: razorpayRefundId, amount: refundAmount };
  }
}

export const paymentService = new PaymentService();
