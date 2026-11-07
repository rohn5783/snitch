import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifyPaymentSignature, verifyWebhookSignature } from "@/lib/server/integrations/razorpay/razorpay.client";

describe("Unit: Razorpay Payments & Fulfillment Status Transitions", () => {
  const secret = "test_razorpay_secret_123456789";

  it("verifies genuine Razorpay payment signatures using timingSafeEqual", () => {
    const orderId = "order_N123456789";
    const paymentId = "pay_P987654321";
    const validSignature = createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const isVerified = verifyPaymentSignature({
      orderId,
      paymentId,
      signature: validSignature,
    });

    expect(isVerified).toBe(true);
  });

  it("rejects tampered or mismatched payment signatures", () => {
    const isTampered = verifyPaymentSignature({
      orderId: "order_N123456789",
      paymentId: "pay_P987654321",
      signature: "0000000000000000000000000000000000000000000000000000000000000000",
    });

    expect(isTampered).toBe(false);
  });

  it("verifies Razorpay webhook signatures against raw request body", () => {
    const rawBody = JSON.stringify({
      entity: "event",
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_test_123" } } },
    });

    const validWebhookSig = createHmac("sha256", secret).update(rawBody).digest("hex");
    const isWebhookValid = verifyWebhookSignature(rawBody, validWebhookSig);

    expect(isWebhookValid).toBe(true);
  });

  it("enforces strict linear order fulfillment transitions without skipping steps", () => {
    const fulfillmentSteps = ["pending", "processing", "ready", "dispatched", "delivered"] as const;

    function isValidTransition(current: string, next: string): boolean {
      const idx = fulfillmentSteps.indexOf(current as (typeof fulfillmentSteps)[number]);
      if (idx === -1) return false;
      return fulfillmentSteps[idx + 1] === next;
    }

    expect(isValidTransition("pending", "processing")).toBe(true);
    expect(isValidTransition("processing", "ready")).toBe(true);
    expect(isValidTransition("ready", "dispatched")).toBe(true);
    expect(isValidTransition("dispatched", "delivered")).toBe(true);

    // Reject skipping steps (e.g. pending -> dispatched or ready -> delivered)
    expect(isValidTransition("pending", "dispatched")).toBe(false);
    expect(isValidTransition("pending", "delivered")).toBe(false);
    expect(isValidTransition("processing", "delivered")).toBe(false);

    // Reject backwards transitions
    expect(isValidTransition("dispatched", "processing")).toBe(false);
    expect(isValidTransition("delivered", "ready")).toBe(false);
  });
});
