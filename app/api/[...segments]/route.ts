import type { NextRequest } from "next/server";
import { errorResponse } from "@/lib/server/errors";
import * as auth from "@/lib/server/auth-api";
import * as cart from "@/lib/server/cart";
import * as orders from "@/lib/server/orders";
import * as products from "@/lib/server/products";
import * as wishlist from "@/lib/server/wishlist";

type RouteContext = { params: Promise<{ segments: string[] }> };

async function dispatch(request: NextRequest, context: RouteContext) {
  try {
    const segments = (await context.params).segments;
    const path = segments.join("/");
    const method = request.method;

    if (path === "auth/register" && method === "POST") return await auth.register(request);
    if (path === "auth/login" && method === "POST") return await auth.login(request);
    if (path === "auth/logout" && method === "POST") return await auth.logout();
    if (path === "auth/me" && method === "GET") return await auth.getMe(request);
    if (path === "auth/google" && method === "GET") return await auth.startGoogleOAuth(request);
    if (path === "auth/google/callback" && method === "GET") return await auth.finishGoogleOAuth(request);

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

    if (path === "cart" && method === "GET") return await cart.getCart(request);
    if (segments[0] === "cart" && segments[1] === "add" && segments.length === 4 && method === "POST") {
      return await cart.addToCart(request, segments[2], segments[3]);
    }
    if (segments[0] === "cart" && segments[1] === "quantity" && segments[2] === "increment" && segments.length === 5 && method === "PATCH") {
      return await cart.incrementCartItem(request, segments[3], segments[4]);
    }
    if (segments[0] === "cart" && segments[1] === "remove" && segments.length === 4 && method === "DELETE") {
      return await cart.removeFromCart(request, segments[2], segments[3]);
    }
    if (path === "cart/payment/create/order" && method === "POST") return await cart.createPaymentOrder(request);
    if (path === "cart/payment/verify/order" && method === "POST") return await cart.verifyPaymentOrder(request);

    if (path === "wishlist" && method === "GET") return await wishlist.getWishlist(request);
    if (segments[0] === "wishlist" && segments[1] === "add" && segments.length === 3 && method === "POST") {
      return await wishlist.addToWishlist(request, segments[2]);
    }
    if (segments[0] === "wishlist" && segments[1] === "remove" && segments.length === 3 && method === "DELETE") {
      return await wishlist.removeFromWishlist(request, segments[2]);
    }

    if (path === "orders" && method === "GET") return await orders.getUserOrders(request);
    if (path === "orders/seller" && method === "GET") return await orders.getSellerOrders(request);
    if (segments[0] === "orders" && segments[1] === "seller" && segments[3] === "fulfillment" && segments.length === 4 && method === "PATCH") {
      return await orders.updateSellerOrderStatus(request, segments[2]);
    }

    return Response.json({ message: "API route not found", success: false }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET = dispatch;
export const POST = dispatch;
export const PATCH = dispatch;
export const DELETE = dispatch;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
