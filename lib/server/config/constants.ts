export const ROLES = {
  BUYER: "buyer",
  SELLER: "seller",
  ADMIN: "admin",
} as const;

export type UserRole = (typeof ROLES)[keyof typeof ROLES];

export const PAYMENT_STATUS = {
  CREATED: "CREATED",
  PENDING: "PENDING",
  AUTHORIZED: "AUTHORIZED",
  CAPTURED: "CAPTURED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
  PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const ORDER_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  READY: "ready",
  DISPATCHED: "dispatched",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  RETURN_REQUESTED: "return_requested",
  RETURNED: "returned",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const FULFILLMENT_STEPS = ["pending", "processing", "ready", "dispatched", "delivered"] as const;

export const AUTH_CONFIG = {
  ACCESS_TOKEN_EXPIRY: "15m",
  REFRESH_TOKEN_EXPIRY: "30d",
  COOKIE_NAME: "token",
  REFRESH_COOKIE_NAME: "refresh_token",
  CSRF_HEADER_NAME: "x-csrf-token",
  CSRF_COOKIE_NAME: "csrf_token",
  CORRELATION_ID_HEADER: "x-request-id",
} as const;

export const CACHE_TTL = {
  SHORT: 60, // 1 minute
  DEFAULT: 300, // 5 minutes
  PRODUCTS: 600, // 10 minutes
  CATEGORIES: 1800, // 30 minutes
  DAY: 86400, // 24 hours
} as const;

