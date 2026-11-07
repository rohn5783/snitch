import { type ClientSession, Types } from "mongoose";
import { connectDB } from "@/lib/server/database/connection";
import AuditLog from "@/lib/server/models/audit-log";
import InventoryReservation, { type IInventoryReservation, type IReservationItem } from "@/lib/server/models/inventory-reservation";
import Product from "@/lib/server/models/product";

export class InventoryRepository {
  async reserveVariantStock(
    productId: string | Types.ObjectId,
    variantId: string | Types.ObjectId,
    quantity: number,
    session?: ClientSession,
  ): Promise<boolean> {
    await connectDB();
    const query = {
      _id: productId,
      variants: {
        $elemMatch: {
          _id: variantId,
          stock: { $gte: quantity },
        },
      },
    };

    const update = {
      $inc: {
        "variants.$.stock": -quantity,
        "variants.$.reservedStock": quantity,
      },
    };

    const result = session
      ? await Product.updateOne(query, update, { session })
      : await Product.updateOne(query, update);

    return result.modifiedCount === 1;
  }

  async releaseVariantStock(
    productId: string | Types.ObjectId,
    variantId: string | Types.ObjectId,
    quantity: number,
    session?: ClientSession,
  ): Promise<boolean> {
    await connectDB();
    const query = {
      _id: productId,
      "variants._id": variantId,
    };

    const update = {
      $inc: {
        "variants.$.stock": quantity,
        "variants.$.reservedStock": -quantity,
      },
    };

    const result = session
      ? await Product.updateOne(query, update, { session })
      : await Product.updateOne(query, update);

    return result.modifiedCount === 1;
  }

  async commitVariantStock(
    productId: string | Types.ObjectId,
    variantId: string | Types.ObjectId,
    quantity: number,
    session?: ClientSession,
  ): Promise<boolean> {
    await connectDB();
    const query = {
      _id: productId,
      "variants._id": variantId,
    };

    const update = {
      $inc: {
        "variants.$.reservedStock": -quantity,
        "variants.$.soldStock": quantity,
        totalSold: quantity,
      },
    };

    const result = session
      ? await Product.updateOne(query, update, { session })
      : await Product.updateOne(query, update);

    return result.modifiedCount === 1;
  }

  async createReservation(
    orderId: string,
    userId: string | Types.ObjectId,
    items: IReservationItem[],
    ttlSeconds = 600,
    session?: ClientSession,
  ): Promise<IInventoryReservation> {
    await connectDB();
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const data = {
      orderId,
      userId: new Types.ObjectId(userId),
      items,
      status: "active" as const,
      expiresAt,
    };

    if (session) {
      const [res] = await InventoryReservation.create([data], { session });
      return res;
    }
    return InventoryReservation.create(data);
  }

  async findReservationByOrderId(orderId: string): Promise<IInventoryReservation | null> {
    await connectDB();
    return InventoryReservation.findOne({ orderId });
  }

  async updateReservationStatus(
    reservationId: Types.ObjectId,
    status: "active" | "committed" | "released" | "expired",
    session?: ClientSession,
  ): Promise<void> {
    await connectDB();
    const opts = session ? { session } : {};
    await InventoryReservation.findByIdAndUpdate(reservationId, { status }, opts);
  }

  async findExpiredActiveReservations(): Promise<IInventoryReservation[]> {
    await connectDB();
    return InventoryReservation.find({
      status: "active",
      expiresAt: { $lte: new Date() },
    });
  }

  async logAudit(
    action: string,
    entityId: string,
    actor: { userId?: string | Types.ObjectId; role?: string; ip?: string },
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await connectDB();
    await AuditLog.create({
      entityType: "inventory",
      entityId,
      action,
      actor: {
        userId: actor.userId ? new Types.ObjectId(actor.userId) : undefined,
        role: actor.role,
        ip: actor.ip,
      },
      metadata,
      timestamp: new Date(),
    });
  }
}

export const inventoryRepository = new InventoryRepository();
