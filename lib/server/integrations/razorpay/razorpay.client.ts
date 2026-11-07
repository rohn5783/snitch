import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { getServerEnv } from "@/lib/server/config/env";
import { AppError } from "@/lib/server/errors/api-error";
import { logger } from "@/lib/server/logger/logger";

let razorpayInstance: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  if (razorpayInstance) return razorpayInstance;

  const env = getServerEnv();
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw AppError.serviceUnavailable("Razorpay keys are not configured");
  }

  // Preserve requirement: In test mode, keys must begin with rzp_test_
  if (env.NODE_ENV !== "production" && !keyId.startsWith("rzp_test_")) {
    throw AppError.serviceUnavailable("Razorpay test mode requires a key ID beginning with rzp_test_");
  }

  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  return razorpayInstance;
}

export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { orderId, paymentId, signature } = params;
  if (!orderId || !paymentId || !signature) return false;

  const env = getServerEnv();
  const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest();

  try {
    const received = Buffer.from(signature, "hex");
    if (received.length !== expected.length) return false;
    return timingSafeEqual(received, expected);
  } catch {
    return false;
  }
}

export function verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean {
  if (!rawBody || !signatureHeader) return false;

  const env = getServerEnv();
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET || env.RAZORPAY_KEY_SECRET;
  if (!webhookSecret) {
    logger.error("RAZORPAY_WEBHOOK_SECRET is not configured");
    return false;
  }

  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  try {
    const expectedBuf = Buffer.from(expected, "utf8");
    const receivedBuf = Buffer.from(signatureHeader, "utf8");
    if (expectedBuf.length !== receivedBuf.length) return false;
    return timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

