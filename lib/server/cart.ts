import { Types } from "mongoose";
import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/server/database/connection";
import { AppError } from "@/lib/server/errors/api-error";
import { readJson } from "@/lib/server/errors/index";
import { requireAuth } from "@/lib/server/middleware/auth-guard";
import { standardResponse } from "@/lib/server/middleware/request-context";
import Cart from "@/lib/server/models/cart";
import Product from "@/lib/server/models/product";
import { paymentService } from "@/lib/server/services/payment.service";

export async function getCart(request: NextRequest) {
  const user = await requireAuth(request);
  const cart = await paymentService.getCartDetails(user._id);

  return standardResponse(
    { cart },
    {
      message: "Cart fetched successfully",
      extra: { cart },
    },
  );
}

export async function addToCart(request: NextRequest, productId: string, variantId: string) {
  const user = await requireAuth(request);
  if (!Types.ObjectId.isValid(productId) || !Types.ObjectId.isValid(variantId)) {
    throw AppError.badRequest("Invalid product or variant ID");
  }

  const body = await readJson(request);
  const quantity = body.quantity === undefined ? 1 : Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw AppError.badRequest("Quantity must be a positive whole number");
  }

  await connectDB();
  const product = await Product.findOne({
    _id: productId,
    isActive: { $ne: false },
    "variants._id": variantId,
  });

  if (!product) {
    throw AppError.notFound("Product or variant not found");
  }

  const variant = product.variants.find((opt: { _id: { toString(): string } }) => opt._id.toString() === variantId);
  if (!variant) {
    throw AppError.notFound("Product or variant not found");
  }

  let cart = await Cart.findOne({ user: user._id });
  if (!cart) {
    cart = await Cart.create({ user: user._id, items: [] });
  }

  // Currency validation across all cart items
  const existingProducts = cart.items.length
    ? await Product.find({ _id: { $in: cart.items.map((i: { product: unknown }) => i.product) } }).select("price variants")
    : [];

  const existingCurrencies = cart.items
    .map((item: { product: unknown; variant?: unknown }) => {
      const ep = existingProducts.find((p) => p._id.toString() === String(item.product));
      const ev = ep?.variants.find((v: { _id: { toString(): string } }) => v._id.toString() === String(item.variant));
      return ev?.price?.currency ?? ep?.price.currency;
    })
    .filter((c: unknown): c is string => typeof c === "string" && Boolean(c));

  const variantCurrency = variant.price?.currency ?? product.price.currency;
  if (existingCurrencies.some((c: string) => c !== variantCurrency)) {
    throw AppError.conflict("A shopping bag can only contain products in one currency");
  }

  const existing = cart.items.find(
    (item: { product: unknown; variant?: unknown }) =>
      String(item.product) === productId && String(item.variant) === variantId,
  );

  const nextQuantity = (existing?.quantity ?? 0) + quantity;
  if (nextQuantity > variant.stock) {
    throw AppError.badRequest(`Only ${variant.stock} items left in stock`);
  }

  if (existing) {
    existing.quantity = nextQuantity;
  } else {
    cart.items.push({
      product: product._id,
      variant: variant._id,
      quantity,
      price: product.price,
    } as unknown as (typeof cart.items)[0]);
  }

  await cart.save();
  return standardResponse(
    {},
    {
      message: existing ? "Cart updated successfully" : "Product added to cart successfully",
    },
  );
}

export async function incrementCartItem(request: NextRequest, productId: string, variantId: string) {
  const user = await requireAuth(request);
  if (!Types.ObjectId.isValid(productId) || !Types.ObjectId.isValid(variantId)) {
    throw AppError.badRequest("Invalid product or variant ID");
  }

  await connectDB();
  const product = await Product.findOne({
    _id: productId,
    isActive: { $ne: false },
    "variants._id": variantId,
  });

  const variant = product?.variants.find((opt: { _id: { toString(): string } }) => opt._id.toString() === variantId);
  if (!product || !variant) {
    throw AppError.notFound("Product or variant not found");
  }

  const cart = await Cart.findOne({ user: user._id });
  if (!cart) {
    throw AppError.notFound("Cart not found");
  }

  const item = cart.items.find(
    (entry: { product: unknown; variant?: unknown }) =>
      String(entry.product) === productId && String(entry.variant) === variantId,
  );

  if (!item) {
    throw AppError.notFound("Cart item not found");
  }

  if (item.quantity + 1 > variant.stock) {
    throw AppError.badRequest(`Only ${variant.stock} items left in stock. You already have ${item.quantity} in your bag`);
  }

  item.quantity += 1;
  await cart.save();

  return standardResponse(
    {},
    { message: "Cart item quantity incremented successfully" },
  );
}

export async function removeFromCart(request: NextRequest, productId: string, variantId: string) {
  const user = await requireAuth(request);
  await connectDB();

  const cart = await Cart.findOne({ user: user._id });
  if (!cart) {
    throw AppError.notFound("Cart not found");
  }

  cart.items = cart.items.filter(
    (item: { product: unknown; variant?: unknown }) =>
      !(String(item.product) === productId && String(item.variant) === variantId),
  ) as unknown as typeof cart.items;

  await cart.save();
  return standardResponse(
    {},
    { message: "Item removed from cart successfully" },
  );
}

export async function createPaymentOrder(request: NextRequest) {
  const user = await requireAuth(request);
  const body = await readJson(request);

  const rawAddress = body.shippingAddress;
  if (!rawAddress || typeof rawAddress !== "object" || Array.isArray(rawAddress)) {
    throw AppError.badRequest("Add your delivery address before checkout");
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
    shippingAddress.fullName.length < 2 ||
    shippingAddress.fullName.length > 120 ||
    !/^[0-9+()\s-]{7,20}$/.test(shippingAddress.phone) ||
    !shippingAddress.addressLine1 ||
    shippingAddress.addressLine1.length > 200 ||
    shippingAddress.addressLine2.length > 200 ||
    !shippingAddress.city ||
    shippingAddress.city.length > 80 ||
    !shippingAddress.state ||
    shippingAddress.state.length > 80 ||
    !/^[a-zA-Z0-9 -]{3,12}$/.test(shippingAddress.postalCode) ||
    !shippingAddress.country ||
    shippingAddress.country.length > 80
  ) {
    throw AppError.badRequest("Enter a valid delivery name, phone, street, city, state, postal code and country");
  }

  const { keyId, order } = await paymentService.createRazorpayOrder(user._id, shippingAddress);

  return standardResponse(
    { keyId, order },
    {
      message: "Order created successfully",
      extra: { keyId, order },
    },
  );
}

export async function verifyPaymentOrder(request: NextRequest) {
  const user = await requireAuth(request);
  const body = await readJson(request);

  const orderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";

  if (!orderId || !paymentId || !signature) {
    throw AppError.badRequest("Incomplete payment verification details");
  }

  const result = await paymentService.verifyPayment(user._id, {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  });

  return standardResponse(
    {},
    {
      message: result.message,
    },
  );
}
