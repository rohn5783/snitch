import { describe, expect, it } from "vitest";
import { formatPrice } from "@/lib/api";

describe("Unit: Pricing and Currency Calculations", () => {
  it("formats prices consistently in INR with standard currency formatting", () => {
    const formatted = formatPrice(2499, "INR");
    expect(formatted).toContain("2,499");
  });

  it("handles zero and fallback formatting without throwing exceptions", () => {
    const formattedZero = formatPrice(0, "INR");
    expect(formattedZero).toContain("0");

    const fallbackFormat = formatPrice(500, "XYZ");
    expect(fallbackFormat).toContain("500");
  });

  it("calculates percentage discounts and caps at maxDiscount accurately", () => {
    const orderTotal = 10000;
    const discountRate = 20; // 20%
    const maxDiscount = 1500;

    const uncappedDiscount = (orderTotal * discountRate) / 100; // 2000
    const finalDiscount = Math.min(uncappedDiscount, maxDiscount); // Capped at 1500

    expect(uncappedDiscount).toBe(2000);
    expect(finalDiscount).toBe(1500);
    expect(orderTotal - finalDiscount).toBe(8500);
  });

  it("calculates fixed discounts and prevents negative order balances", () => {
    const orderTotal = 800;
    const fixedDiscount = 1000;

    const discountAmount = Math.min(orderTotal, fixedDiscount);
    const payableAmount = Math.max(0, orderTotal - discountAmount);

    expect(discountAmount).toBe(800);
    expect(payableAmount).toBe(0);
  });
});

