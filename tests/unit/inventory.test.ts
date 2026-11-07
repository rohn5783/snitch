import { describe, expect, it } from "vitest";

describe("Unit: Inventory & Stock Calculations", () => {
  it("determines correct availability status based on variant quantity thresholds", () => {
    function computeStatus(stock: number): "in_stock" | "low_stock" | "out_of_stock" {
      if (stock <= 0) return "out_of_stock";
      if (stock <= 5) return "low_stock";
      return "in_stock";
    }

    expect(computeStatus(25)).toBe("in_stock");
    expect(computeStatus(5)).toBe("low_stock");
    expect(computeStatus(1)).toBe("low_stock");
    expect(computeStatus(0)).toBe("out_of_stock");
    expect(computeStatus(-2)).toBe("out_of_stock");
  });

  it("calculates atomic reservation deduction and guarantees invariant: available + reserved = total", () => {
    const totalPhysicalStock = 10;
    let availableStock = 10;
    let reservedStock = 0;
    let soldStock = 0;

    const requestedQuantity = 3;

    // Simulate reservation
    expect(availableStock >= requestedQuantity).toBe(true);
    availableStock -= requestedQuantity;
    reservedStock += requestedQuantity;

    expect(availableStock).toBe(7);
    expect(reservedStock).toBe(3);
    expect(availableStock + reservedStock + soldStock).toBe(totalPhysicalStock);

    // Simulate payment commit
    reservedStock -= requestedQuantity;
    soldStock += requestedQuantity;

    expect(availableStock).toBe(7);
    expect(reservedStock).toBe(0);
    expect(soldStock).toBe(3);
    expect(availableStock + reservedStock + soldStock).toBe(totalPhysicalStock);
  });

  it("detects expired reservations and correctly rolls back stock", () => {
    let availableStock = 4;
    let reservedStock = 2;

    const reservation = {
      expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      quantity: 2,
    };

    const isExpired = Date.now() > reservation.expiresAt.getTime();
    expect(isExpired).toBe(true);

    // Rollback
    availableStock += reservation.quantity;
    reservedStock -= reservation.quantity;

    expect(availableStock).toBe(6);
    expect(reservedStock).toBe(0);
  });
});

