import { type ClientSession, Types } from "mongoose";
import { AppError } from "@/lib/server/errors/api-error";
import { logger } from "@/lib/server/logger/logger";
import { type IReservationItem } from "@/lib/server/models/inventory-reservation";
import { inventoryRepository, type InventoryRepository } from "@/lib/server/repositories/inventory.repository";

export class InventoryService {
  constructor(private readonly inventoryRepo: InventoryRepository = inventoryRepository) {}

  async reserveStock(
    orderId: string,
    userId: string,
    items: Array<{ productId: string | Types.ObjectId; variantId: string | Types.ObjectId; quantity: number }>,
    ttlSeconds = 600,
  ): Promise<void> {
    const reservedItems: IReservationItem[] = [];

    for (const item of items) {
      const prodId = new Types.ObjectId(item.productId);
      const varId = new Types.ObjectId(item.variantId);
      const success = await this.inventoryRepo.reserveVariantStock(prodId, varId, item.quantity);

      if (!success) {
        // Compensating transaction: rollback all successfully reserved items so far
        for (const reserved of reservedItems) {
          await this.inventoryRepo.releaseVariantStock(reserved.productId, reserved.variantId, reserved.quantity);
        }
        throw AppError.conflict("One or more items in your bag became unavailable. Please review your bag.");
      }

      reservedItems.push({
        productId: prodId,
        variantId: varId,
        quantity: item.quantity,
      });
    }

    await this.inventoryRepo.createReservation(orderId, userId, reservedItems, ttlSeconds);
    await this.inventoryRepo.logAudit("RESERVE_STOCK", orderId, { userId }, { itemCount: items.length });
    logger.info("Inventory reserved successfully", { orderId, itemCount: items.length });
  }

  async commitReservation(orderId: string, session?: ClientSession): Promise<void> {
    const reservation = await this.inventoryRepo.findReservationByOrderId(orderId);
    if (!reservation) {
      logger.warn("No active inventory reservation found to commit for order", { orderId });
      return;
    }

    if (reservation.status === "committed") {
      return; // Already committed idempotently
    }

    if (reservation.status !== "active") {
      throw AppError.conflict(`Cannot commit inventory with status ${reservation.status}`);
    }

    for (const item of reservation.items) {
      await this.inventoryRepo.commitVariantStock(item.productId, item.variantId, item.quantity, session);
    }

    await this.inventoryRepo.updateReservationStatus(reservation._id, "committed", session);
    await this.inventoryRepo.logAudit("COMMIT_STOCK", orderId, { userId: reservation.userId }, { itemCount: reservation.items.length });
    logger.info("Inventory committed successfully", { orderId });
  }

  async releaseReservation(orderId: string, reason = "Payment cancelled or failed"): Promise<void> {
    const reservation = await this.inventoryRepo.findReservationByOrderId(orderId);
    if (!reservation) {
      return;
    }

    if (reservation.status !== "active") {
      return; // Only active reservations need release
    }

    for (const item of reservation.items) {
      await this.inventoryRepo.releaseVariantStock(item.productId, item.variantId, item.quantity);
    }

    await this.inventoryRepo.updateReservationStatus(reservation._id, "released");
    await this.inventoryRepo.logAudit("RELEASE_STOCK", orderId, { userId: reservation.userId }, { reason });
    logger.info("Inventory reservation released", { orderId, reason });
  }

  async sweepExpiredReservations(): Promise<number> {
    const expiredList = await this.inventoryRepo.findExpiredActiveReservations();
    let releasedCount = 0;

    for (const reservation of expiredList) {
      try {
        for (const item of reservation.items) {
          await this.inventoryRepo.releaseVariantStock(item.productId, item.variantId, item.quantity);
        }
        await this.inventoryRepo.updateReservationStatus(reservation._id, "expired");
        await this.inventoryRepo.logAudit("EXPIRE_STOCK", reservation.orderId, { userId: reservation.userId });
        releasedCount++;
      } catch (err) {
        logger.error("Failed to release expired reservation", err, { reservationId: reservation._id.toString() });
      }
    }

    if (releasedCount > 0) {
      logger.info(`Swept and released ${releasedCount} expired inventory reservations`);
    }
    return releasedCount;
  }
}

export const inventoryService = new InventoryService();
