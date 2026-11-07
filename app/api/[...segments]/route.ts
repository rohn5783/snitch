import type { NextRequest } from "next/server";
import * as auth from "@/lib/server/auth-api";
import * as cart from "@/lib/server/cart";
import { errorResponse, readJson } from "@/lib/server/errors/index";
import { requireAuth } from "@/lib/server/middleware/auth-guard";
import { getRequestContext, standardResponse } from "@/lib/server/middleware/request-context";
import * as orders from "@/lib/server/orders";
import * as products from "@/lib/server/products";
import { analyticsService } from "@/lib/server/services/analytics.service";
import { couponService } from "@/lib/server/services/coupon.service";
import { paymentService } from "@/lib/server/services/payment.service";
import { reviewService } from "@/lib/server/services/review.service";
import * as wishlist from "@/lib/server/wishlist";

type RouteContext = { params: Promise<{ segments: string[] }> };

async function dispatch(request: NextRequest, context: RouteContext) {
  const { correlationId } = getRequestContext(request);

  try {
    const segments = (await context.params).segments;
    const path = segments.join("/");
    const method = request.method;

    // Authentication Routes
    if (path === "auth/register" && method === "POST") return await auth.register(request);
    if (path === "auth/login" && method === "POST") return await auth.login(request);
    if (path === "auth/refresh" && method === "POST") return await auth.refreshToken(request);
    if (path === "auth/logout" && method === "POST") return await auth.logout(request);
    if (path === "auth/me" && method === "GET") return await auth.getMe(request);
    if (path === "auth/google" && method === "GET") return auth.startGoogleOAuth(request);
    if (path === "auth/google/callback" && method === "GET") return await auth.finishGoogleOAuth(request);

    // Product Routes
    if (path === "products/seller" && method === "GET") return await products.getSellerProducts(request);
    if (segments[0] === "products" && segments[1] === "seller" && segments.length === 3 && method === "GET") {
      return await products.getSellerProduct(request, segments[2]);
    }
    if (path === "products" && method === "GET") return await products.getProducts(request);
    if (path === "products" && method === "POST") return await products.createProduct(request);
    if (segments[0] === "products" && segments.length === 2 && method === "PATCH") {
      return await products.updateSellerProduct(request, segments[1]);
    }
    if (segments[0] === "products" && segments[1] === "detail" && segments.length === 3 && method === "GET") {
      return await products.getProduct(segments[2]);
    }
    if (segments[0] === "products" && segments.length === 3 && segments[2] === "variants" && method === "POST") {
      return await products.addProductVariant(request, segments[1]);
    }
    if (segments[0] === "products" && segments.length === 4 && segments[2] === "variants" && method === "PATCH") {
      return await products.updateProductVariant(request, segments[1], segments[3]);
    }

    // Product Reviews
    if (segments[0] === "products" && segments[2] === "reviews" && segments.length === 3) {
      const productId = segments[1];
      if (method === "GET") {
        const page = Number(request.nextUrl.searchParams.get("page") || "1");
        const limit = Number(request.nextUrl.searchParams.get("limit") || "10");
        const result = await reviewService.getProductReviews(productId, page, limit);
        return standardResponse(result, { correlationId });
      }
      if (method === "POST") {
        const user = await requireAuth(request);
        const body = (await readJson(request)) as { rating: number; title: string; comment: string };
        const review = await reviewService.addReview(user._id.toString(), productId, body);
        return standardResponse({ review }, { status: 201, message: "Review posted successfully", correlationId });
      }
    }

    // Cart Routes
    if (path === "cart" && method === "GET") return await cart.getCart(request);
    if (segments[0] === "cart" && segments[1] === "add" && segments.length === 4 && method === "POST") {
      return await cart.addToCart(request, segments[2], segments[3]);
    }
    if (
      segments[0] === "cart" &&
      segments[1] === "quantity" &&
      segments[2] === "increment" &&
      segments.length === 5 &&
      method === "PATCH"
    ) {
      return await cart.incrementCartItem(request, segments[3], segments[4]);
    }
    if (segments[0] === "cart" && segments[1] === "remove" && segments.length === 4 && method === "DELETE") {
      return await cart.removeFromCart(request, segments[2], segments[3]);
    }
    if (path === "cart/payment/create/order" && method === "POST") return await cart.createPaymentOrder(request);
    if (path === "cart/payment/verify/order" && method === "POST") return await cart.verifyPaymentOrder(request);

    // Wishlist Routes
    if (path === "wishlist" && method === "GET") return await wishlist.getWishlist(request);
    if (segments[0] === "wishlist" && segments[1] === "add" && segments.length === 3 && method === "POST") {
      return await wishlist.addToWishlist(request, segments[2]);
    }
    if (segments[0] === "wishlist" && segments[1] === "remove" && segments.length === 3 && method === "DELETE") {
      return await wishlist.removeFromWishlist(request, segments[2]);
    }

    // Orders & Fulfillment
    if (path === "orders" && method === "GET") return await orders.getUserOrders(request);
    if (path === "orders/seller" && method === "GET") return await orders.getSellerOrders(request);
    if (
      segments[0] === "orders" &&
      segments[1] === "seller" &&
      segments[3] === "fulfillment" &&
      segments.length === 4 &&
      method === "PATCH"
    ) {
      return await orders.updateSellerOrderStatus(request, segments[2]);
    }

    // Refunds
    if (segments[0] === "orders" && segments[2] === "refund" && segments.length === 3 && method === "POST") {
      const user = await requireAuth(request, ["seller", "admin"]);
      const body = (await readJson(request)) as { amount?: number; reason?: string };
      const refund = await paymentService.processRefund(segments[1], {
        userId: user._id.toString(),
        role: user.role,
      }, body);
      return standardResponse({ refund }, { message: "Refund processed successfully", correlationId });
    }

    // Coupons
    if (path === "coupons/validate" && method === "POST") {
      const user = await requireAuth(request);
      const body = (await readJson(request)) as { code: string; orderAmount: number };
      const result = await couponService.validateCoupon(body.code, user._id.toString(), body.orderAmount);
      return standardResponse({ coupon: result }, { message: result.message, correlationId });
    }
    if (path === "coupons" && method === "POST") {
      const user = await requireAuth(request, ["seller", "admin"]);
      const body = (await readJson(request)) as Parameters<typeof couponService.createCoupon>[2];
      const coupon = await couponService.createCoupon(user._id.toString(), user.role as "seller" | "admin", body);
      return standardResponse({ coupon }, { status: 201, message: "Coupon created successfully", correlationId });
    }

    // Analytics
    if (path === "analytics/seller" && method === "GET") {
      const seller = await requireAuth(request, "seller");
      const analytics = await analyticsService.getSellerAnalytics(seller._id.toString());
      return standardResponse({ analytics }, { message: "Seller analytics fetched successfully", correlationId });
    }
    if (path === "analytics/admin" && method === "GET") {
      await requireAuth(request, "admin");
      const analytics = await analyticsService.getAdminAnalytics();
      return standardResponse({ analytics }, { message: "Admin analytics fetched successfully", correlationId });
    }

    return standardResponse(
      {},
      { status: 404, message: "API route not found", correlationId },
    );
  } catch (error) {
    return errorResponse(error, correlationId);
  }
}

export const GET = dispatch;
export const POST = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
