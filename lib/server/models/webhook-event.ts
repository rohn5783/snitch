import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IWebhookEvent extends Document {
  _id: mongoose.Types.ObjectId;
  eventId: string;
  provider: "razorpay";
  event: string;
  payload: Record<string, unknown>;
  processed: boolean;
  error?: string;
  processedAt?: Date;
  createdAt: Date;
}

const webhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    provider: { type: String, default: "razorpay", index: true },
    event: { type: String, required: true },
    payload: { type: Schema.Types.Mixed },
    processed: { type: Boolean, default: false, index: true },
    error: String,
    processedAt: Date,
  },
  { timestamps: true },
);

// TTL index to automatically purge old webhook logs after 30 days
webhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 86400 });

const WebhookEvent =
  (mongoose.models.webhook_event as Model<IWebhookEvent>) ??
  mongoose.model<IWebhookEvent>("webhook_event", webhookEventSchema);

export default WebhookEvent;

