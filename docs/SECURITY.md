# SNITCH — Security Architecture & Threat Model

**Status:** Production Standard Implemented  
**Date:** November 2026  
**Classification:** Enterprise Security Documentation  

---

## 1. Authentication & Session Security

- [x] **Password Hashing**: Bcrypt with work factor 12. Pre-save hooks only hash when modified.
- [x] **Dual-Token JWT Architecture**:
  - **Access Token**: Short-lived (15 minutes), digitally signed with HMAC-SHA256 using `JWT_SECRET`.
  - **Refresh Token**: Cryptographically random 256-bit token stored as SHA-256 hash in MongoDB.
  - **Token Rotation**: Every refresh exchanges the existing refresh token for a brand new token pair.
  - **Token Replay Detection**: Reusing an old refresh token automatically invalidates all active sessions for the user.
- [x] **Cookie Security Configuration**:
  - `HttpOnly`: Enforced. JavaScript cannot read session cookies (`token`, `refresh_token`).
  - `Secure`: Dynamically set to `true` in production (enforcing HTTPS transmission).
  - `SameSite=Lax`: Mitigates Cross-Site Request Forgery (CSRF).
  - `Path=/`: Restricts scope appropriately.
- [x] **Active Session Management**: Users can sign out from a single device or revoke all active sessions across all devices.
- [x] **Role-Based Access Control (RBAC)**:
  - Three distinct roles: `buyer`, `seller`, `admin`.
  - Server-side role resolution from trusted database records (never trusted from request payloads).
  - Fine-grained route authorization middleware (`requireAuth(request, ["seller", "admin"])`).

---

## 2. API Protection & Rate Limiting

- [x] **Brute-Force Attack Mitigation**:
  - `/api/auth/login`: Maximum 10 requests per 10 minutes per IP address.
  - `/api/auth/register`: Maximum 15 requests per 15 minutes per IP address.
  - Sliding-window algorithm backed by memory store with automatic garbage collection, and Redis-ready.
- [x] **Cross-Site Request Forgery (CSRF) Defense**:
  - Double-submit signed token verification for state-changing HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`).
  - Webhook endpoints verified via raw-body HMAC-SHA256 signatures instead of cookies.
  - Origin and Referer validation as defense-in-depth.
- [x] **Strict Input Validation**:
  - All incoming request bodies validated using Zod schemas (`registerSchema`, `loginSchema`, etc.).
  - Strips unknown fields and enforces length boundaries, sanitization, and regex patterns.
- [x] **IDOR & Privilege Escalation Prevention**:
  - Sellers can only read, edit, or update listings where `seller === authenticatedUser._id`.
  - Fulfillment updates strictly verify that the order item belongs to the authenticated seller's catalog.
  - Buyers can only access orders where `user === authenticatedUser._id`.

---

## 3. Payment Processing & Razorpay Hardening

- [x] **Server-Side Price Calculation**:
  - Payable checkout amount is computed strictly on the server by loading trusted database prices.
  - Frontend prices are completely ignored during order creation.
- [x] **Cryptographic Signature Verification**:
  - Timing-safe HMAC-SHA256 comparison (`timingSafeEqual`) on `order_id|payment_id`.
  - Orders are never marked as `paid` without successful signature verification or verified webhook confirmation.
- [x] **Raw-Body Webhook Signature Verification**:
  - Dedicated webhook endpoint verifies `x-razorpay-signature` against `RAZORPAY_WEBHOOK_SECRET` using unmodified request bytes.
  - Processed webhook event IDs are persisted in MongoDB to prevent duplicate replay attacks.
- [x] **Atomic Inventory Deduction & Concurrency Control**:
  - Stock updates use conditional atomic operations (`$inc` with stock `$gte: quantity`).
  - Prevents overselling when multiple concurrent checkouts occur simultaneously.

---

## 4. Media Upload Security

- [x] **MIME Type Validation**: Only genuine image MIME types (`image/jpeg`, `image/png`, `image/webp`) are accepted.
- [x] **File Size Limits**: Maximum 5 MB per image file, maximum 7 images per request.
- [x] **Isolated Cloud Storage**: Files are streamed directly to ImageKit; no arbitrary files are saved to the server's local filesystem.

---

## 5. Security Headers & Redaction

- [x] `X-Content-Type-Options: nosniff`
- [x] `X-Frame-Options: DENY`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] **Log Redaction**: Automatic stripping and `[REDACTED]` masking of sensitive keys (`password`, `token`, `secret`, `signature`, `cvv`, `authorization`) in all structured logs.

