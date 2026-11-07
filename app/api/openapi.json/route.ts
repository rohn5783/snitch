import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  const spec = {
    openapi: "3.0.0",
    info: {
      title: "SNITCH E-Commerce Marketplace API",
      version: "2.0.0",
      description: "Production-grade RESTful API for SNITCH 3D fashion e-commerce marketplace.",
    },
    servers: [
      {
        url: "/api",
        description: "Local / Production Gateway",
      },
    ],
    paths: {
      "/health": {
        get: {
          summary: "Liveness probe",
          responses: {
            "200": { description: "API service is alive" },
          },
        },
      },
      "/ready": {
        get: {
          summary: "Readiness probe",
          responses: {
            "200": { description: "Database and infrastructure ready" },
            "503": { description: "Database unavailable" },
          },
        },
      },
      "/auth/register": {
        post: {
          summary: "Register a new buyer or seller",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["fullname", "email", "contact", "password"],
                  properties: {
                    fullname: { type: "string" },
                    email: { type: "string", format: "email" },
                    contact: { type: "string", pattern: "^\\d{10}$" },
                    password: { type: "string", minLength: 6 },
                    isSeller: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "User registered and session cookies attached" },
            "400": { description: "Validation error or user already exists" },
          },
        },
      },
      "/auth/login": {
        post: {
          summary: "Sign in with email and password",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "User authenticated and session cookies set" },
            "400": { description: "Invalid credentials" },
          },
        },
      },
      "/auth/logout": {
        post: {
          summary: "Sign out and clear session tokens",
          responses: {
            "200": { description: "Session revoked and cookies cleared" },
          },
        },
      },
      "/auth/me": {
        get: {
          summary: "Retrieve current authenticated user profile",
          responses: {
            "200": { description: "User details" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/products": {
        get: {
          summary: "Search and filter product catalog",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "minPrice", in: "query", schema: { type: "number" } },
            { name: "maxPrice", in: "query", schema: { type: "number" } },
            { name: "sort", in: "query", schema: { type: "string", enum: ["newest", "price_asc", "price_desc", "popular", "rating"] } },
          ],
          responses: {
            "200": { description: "Paginated catalog listings" },
          },
        },
        post: {
          summary: "Create product listing (Seller only)",
          responses: {
            "201": { description: "Product created" },
            "403": { description: "Forbidden" },
          },
        },
      },
      "/cart": {
        get: {
          summary: "Fetch customer cart with revalidated pricing",
          responses: { "200": { description: "Shopping cart details" } },
        },
      },
      "/cart/payment/create/order": {
        post: {
          summary: "Create Razorpay payment order and reserve inventory",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["shippingAddress"],
                },
              },
            },
          },
          responses: {
            "200": { description: "Razorpay order created with order id and key" },
            "409": { description: "Insufficient stock or currency mismatch" },
          },
        },
      },
      "/cart/payment/verify/order": {
        post: {
          summary: "Verify Razorpay payment signature and commit inventory",
          responses: {
            "200": { description: "Payment verified, inventory committed, cart cleared" },
            "400": { description: "Invalid signature" },
          },
        },
      },
      "/payments/razorpay/webhook": {
        post: {
          summary: "Razorpay payment webhook receiver",
          responses: {
            "200": { description: "Webhook event processed idempotently" },
            "400": { description: "Invalid webhook signature" },
          },
        },
      },
      "/orders": {
        get: {
          summary: "Retrieve buyer order history",
          responses: { "200": { description: "List of orders" } },
        },
      },
      "/orders/seller": {
        get: {
          summary: "Retrieve seller orders containing their listings",
          responses: { "200": { description: "Seller orders list" } },
        },
      },
      "/analytics/seller": {
        get: {
          summary: "Real-time seller performance analytics",
          responses: { "200": { description: "Sales, revenue, best sellers, low stock" } },
        },
      },
      "/analytics/admin": {
        get: {
          summary: "Platform-wide administrative metrics (Admin only)",
          responses: { "200": { description: "Platform revenue, user growth, categories" } },
        },
      },
    },
  };

  return NextResponse.json(spec);
}

