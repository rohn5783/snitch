import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IReservationItem {
  productId: mongoose.Types.ObjectId;
  variantId: mongoose.Types.ObjectId;
  quantity: number;
}

export interface IInventoryReservation extends Document {
  _id: mongoose.Types.ObjectId;
  orderId: string;
  userId: mongoose.Types.ObjectId;
  items: IReservationItem[];
  status: "active" | "committed" | "released" | "expired";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reservationItemSchema = new Schema<IReservationItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "product", required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const inventoryReservationSchema = new Schema<IInventoryReservation>(
  {
    orderId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "user", required: true, index: true },
    items: [reservationItemSchema],
    status: {
      type: String,
      enum: ["active", "committed", "released", "expired"],
      default: "active",
      index: true,
    },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true },
);

// TTL index to automatically remove or clean up old expired reservation records after 24 hours
inventoryReservationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });
inventoryReservationSchema.index({ orderId: 1, status: 1 });

const InventoryReservation =
  (mongoose.models.inventory_reservation as Model<IInventoryReservation>) ??
  mongoose.model<IInventoryReservation>("inventory_reservation", inventoryReservationSchema);

export default InventoryReservation;

