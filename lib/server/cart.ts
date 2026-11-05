import mongoose, { Types, type ClientSession } from "mongoose";
import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { authenticate } from "@/lib/server/auth";
import { requiredEnv } from "@/lib/server/env";
import { ApiError, readJson } from "@/lib/server/errors";
import { connectDB } from "@/lib/server/db";
import Cart from "@/lib/server/models/cart";
import Payment from "@/lib/server/models/payment";
import Product from "@/lib/server/models/product";

type PopulatedProduct = {
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

type CartEntry = {
  _id?: Types.ObjectId;
  product: Types.ObjectId;
  variant?: Types.ObjectId;
  quantity: number;
  price: { amount: number; currency: string };
};

type CartDocument = {
  items: CartEntry[];
  save: (options?: { session?: ClientSession }) => Promise<unknown>;
};

type ProductDocument = {
  _id: Types.ObjectId;
  price: { amount: number; currency: string };
  variants: Array<{ _id: Types.ObjectId; stock: number; price?: { amount: number; currency: string } }>;
};

async function cartDetails(userId: Types.ObjectId) {
  await connectDB();
  let cart = await Cart.findOne({ user: userId }).populate("items.product");
  if (!cart) cart = await Cart.create({ user: userId, items: [] });

  const cartRecord = cart.toObject() as unknown as {
    _id: Types.ObjectId;
    items: Array<{
      _id: Types.ObjectId;
      product: PopulatedProduct;
      variant: Types.ObjectId;
      quantity: number;
      price: { amount: number; currency: string };
    }>;
  };
  let totalPrice = 0;
  let currency = "INR";
  let hasCurrency = false;
  const items = cartRecord.items.flatMap((item) => {
    const product = item.product;
    const variant = product?.variants.find((option) => option._id.toString() === item.variant?.toString());
    if (!product || !variant) return [];
    const unitPrice = variant.price ?? product.price;
    totalPrice += unitPrice.amount * item.quantity;
    if (!hasCurrency) currency = unitPrice.currency;
    hasCurrency = true;
    return [{ ...item, product, variant }];
  });

  return { _id: cartRecord._id, items, totalPrice, currency };
}

export async function getCart(request: NextRequest) {
  const user = await authenticate(request);
  const cart = await cartDetails(user._id);
  return Response.json({ message: "Cart fetched successfully", success: true, cart });
}

export async function addToCart(request: NextRequest, productId: string, variantId: string) {
  const user = await authenticate(request);
  if (!Types.ObjectId.isValid(productId) || !Types.ObjectId.isValid(variantId)) {
    throw new ApiError("Invalid product or variant ID", 400);
  }
  const body = await readJson(request);
  const quantity = body.quantity === undefined ? 1 : Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) throw new ApiError("Quantity must be at least 1", 400);
  await connectDB();
  const product = await Product.findOne({ _id: productId, isActive: { $ne: false }, "variants._id": variantId }) as unknown as ProductDocument | null;
  if (!product) throw new ApiError("Product or variant not found", 404);
  const variant = product.variants.find((option) => option._id.toString() === variantId);
  if (!variant) throw new ApiError("Product or variant not found", 404);

  const cart = ((await Cart.findOne({ user: user._id })) ?? await Cart.create({ user: user._id, items: [] })) as unknown as CartDocument;
  const existingProducts = cart.items.length
    ? await Product.find({ _id: { $in: cart.items.map((item) => item.product) } }).select("price variants") as unknown as ProductDocument[]
    : [];
  const existingCurrencies = cart.items.map((item) => {
    const existingProduct = existingProducts.find((entry) => entry._id.toString() === item.product.toString());
    const existingVariant = existingProduct?.variants.find((option) => option._id.toString() === item.variant?.toString());
    return existingVariant?.price?.currency ?? existingProduct?.price.currency;
  }).filter((currency): currency is string => Boolean(currency));
  if (existingCurrencies.some((currency) => currency !== (variant.price?.currency ?? product.price.currency))) {
    throw new ApiError("A shopping bag can only contain products in one currency", 409);
  }
  const existing = cart.items.find((item: CartEntry) =>
    item.product.toString() === productId && item.variant?.toString() === variantId,
  );
  const nextQuantity = (existing?.quantity ?? 0) + quantity;
  if (nextQuantity > variant.stock) throw new ApiError(`Only ${variant.stock} items left in stock`, 400);

  if (existing) existing.quantity = nextQuantity;
  else cart.items.push({ product: product._id, variant: variant._id, quantity, price: product.price });
  await cart.save();
  return Response.json({ message: existing ? "Cart updated successfully" : "Product added to cart successfully", success: true });
}

export async function incrementCartItem(request: NextRequest, productId: string, variantId: string) {
  const user = await authenticate(request);
  if (!Types.ObjectId.isValid(productId) || !Types.ObjectId.isValid(variantId)) {
    throw new ApiError("Invalid product or variant ID", 400);
  }
  await connectDB();
  const product = await Product.findOne({ _id: productId, isActive: { $ne: false }, "variants._id": variantId }) as unknown as ProductDocument | null;
  const variant = product?.variants.find((option) => option._id.toString() === variantId);
  if (!product || !variant) throw new ApiError("Product or variant not found", 404);
  const cart = await Cart.findOne({ user: user._id }) as unknown as CartDocument | null;
  if (!cart) throw new ApiError("Cart not found", 404);
  const item = cart.items.find((entry: CartEntry) =>
    entry.product.toString() === productId && entry.variant?.toString() === variantId,
  );
  if (!item) throw new ApiError("Cart item not found", 404);
  if (item.quantity + 1 > variant.stock) {
    throw new ApiError(`Only ${variant.stock} items left in stock. You already have ${item.quantity} in your bag`, 400);
  }
  item.quantity += 1;
  await cart.save();
  return Response.json({ message: "Cart item quantity incremented successfully", success: true });
}

export async function removeFromCart(request: NextRequest, productId: string, variantId: string) {
  const user = await authenticate(request);
  await connectDB();
  const cart = await Cart.findOne({ user: user._id }) as unknown as CartDocument | null;
  if (!cart) throw new ApiError("Cart not found", 404);
  cart.items = cart.items.filter((item: CartEntry) =>
    item.product.toString() !== productId || item.variant?.toString() !== variantId,
  );
  await cart.save();
  return Response.json({ message: "Item removed from cart successfully", success: true });
}

export async function createPaymentOrder(request: NextRequest) {
  const user = await authenticate(request);
  const body = await readJson(request);
  const rawAddress = body.shippingAddress;
  if (!rawAddress || typeof rawAddress !== "object" || Array.isArray(rawAddress)) {
    throw new ApiError("Add your delivery address before checkout", 400);
  }
  const address = rawAddress as Record<string, unknown>;
  const shippingAddress = {
    fullName: typeof address.fullName === "string" ? address.fullName.trim() : "",
    phone: typeof address.phone === "string" ? address.phone.trim() : "",
    addressLine1: typeof address.addressLine1 === "string" ? address.addressLine1.trim() : "",
    addressLine2: typeof address.addressLine2 === "string" ? address.addressLine2.trim() : "",
    city: typeof address.city === "string" ? address.city.trim() : "",
    state: typeof address.state === "string" ? address.state.trim() : "",
    postalCode: typeof address.postalCode === "string" ? address.postalCode.trim() : "",
    country: typeof address.country === "string" ? address.country.trim() : "",
  };
  if (
    shippingAddress.fullName.length < 2 || shippingAddress.fullName.length > 120
    || !/^[0-9+()\s-]{7,20}$/.test(shippingAddress.phone)
    || !shippingAddress.addressLine1 || shippingAddress.addressLine1.length > 200
    || shippingAddress.addressLine2.length > 200
    || !shippingAddress.city || shippingAddress.city.length > 80
    || !shippingAddress.state || shippingAddress.state.length > 80
    || !/^[a-zA-Z0-9 -]{3,12}$/.test(shippingAddress.postalCode)
    || !shippingAddress.country || shippingAddress.country.length > 80
  ) {
    throw new ApiError("Enter a valid delivery name, phone, street, city, state, postal code and country", 400);
  }
  const cart = await cartDetails(user._id);
  if (!cart.items.length || cart.totalPrice <= 0) throw new ApiError("Cart is empty", 400);
  if (cart.items.some((item) => (item.variant.price?.currency ?? item.product.price.currency) !== cart.currency)) {
    throw new ApiError("A shopping bag can only contain products in one currency. Remove items in another currency to continue.", 409);
  }
  for (const item of cart.items) {
    if (item.product.isActive === false) throw new ApiError(`${item.product.title} is no longer available`, 409);
    if (item.variant.stock < item.quantity) throw new ApiError(`Only ${item.variant.stock} of ${item.product.title} remain in stock`, 409);
  }

  const keyId = requiredEnv("RAZORPAY_KEY_ID");
  if (!keyId.startsWith("rzp_test_")) {
    throw new ApiError("Razorpay test mode requires a key ID beginning with rzp_test_.", 503);
  }
  const keySecret = requiredEnv("RAZORPAY_KEY_SECRET");
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const order = await razorpay.orders.create({
    amount: Math.round(cart.totalPrice * 100),
    currency: cart.currency,
  });

  await Payment.create({
    user: user._id,
    shippingAddress,
    razorpay: { orderId: order.id },
    price: { amount: cart.totalPrice, currency: cart.currency },
    orderItems: cart.items.map((item) => {
      const variantPrice = item.variant.price ?? item.product.price;
      return {
        title: item.product.title,
        productId: item.product._id,
        sellerId: item.product.seller,
        variantId: item.variant._id,
        quantity: item.quantity,
        images: item.variant.images.length ? item.variant.images : item.product.images,
        description: item.product.description,
        price: { amount: variantPrice.amount, currency: variantPrice.currency },
      };
    }),
  });

  return Response.json({ message: "Order created successfully", success: true, keyId, order });
}

export async function verifyPaymentOrder(request: NextRequest) {
  const user = await authenticate(request);
  const body = await readJson(request);
  const orderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";
  if (!orderId || !paymentId || !signature) throw new ApiError("Incomplete payment verification details", 400);

  const expected = createHmac("sha256", requiredEnv("RAZORPAY_KEY_SECRET"))
    .update(`${orderId}|${paymentId}`)
    .digest();
  const received = Buffer.from(signature, "hex");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new ApiError("Payment verification failed", 400);
  }

  await connectDB();
  const session = await mongoose.startSession();
  let alreadyProcessed = false;
  try {
    await session.withTransaction(async () => {
      const payment = await Payment.findOne({
        "razorpay.orderId": orderId,
        user: user._id,
      }).session(session);
      if (!payment) throw new ApiError("Payment not found", 404);
      if (payment.status === "paid") {
        if (payment.razorpay.paymentId !== paymentId) {
          throw new ApiError("Order was already paid with a different payment", 409);
        }
        alreadyProcessed = true;
        return;
      }
      if (payment.status !== "pending") throw new ApiError("Payment is not pending", 409);

      const orderItems = payment.orderItems as unknown as Array<{
        title: string;
        productId: Types.ObjectId;
        variantId: Types.ObjectId;
        quantity: number;
      }>;
      for (const item of orderItems) {
        const result = await Product.updateOne({
          _id: item.productId,
          variants: { $elemMatch: { _id: item.variantId, stock: { $gte: item.quantity } } },
        }, { $inc: { "variants.$.stock": -item.quantity } }, { session });
        if (result.modifiedCount !== 1) throw new ApiError(`Insufficient stock for ${item.title}`, 409);
      }

      const cart = await Cart.findOne({ user: user._id }).session(session) as unknown as (CartDocument & { items: CartEntry[] }) | null;
      if (cart) {
        for (const purchased of orderItems) {
          const item = cart.items.find((entry: CartEntry) =>
            entry.product.toString() === purchased.productId.toString()
            && entry.variant?.toString() === purchased.variantId.toString(),
          );
          if (!item) continue;
          item.quantity -= purchased.quantity;
          if (item.quantity <= 0) {
            cart.items = cart.items.filter((entry) => entry._id?.toString() !== item._id?.toString());
          }
        }
        await cart.save({ session });
      }

      payment.status = "paid";
      payment.razorpay.paymentId = paymentId;
      payment.razorpay.signature = signature;
      await payment.save({ session });
    });
  } finally {
    await session.endSession();
  }

  return Response.json({
    message: alreadyProcessed ? "Payment was already processed" : "Payment verified and inventory updated",
    success: true,
  });
}
