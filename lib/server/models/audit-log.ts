import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  entityType: "payment" | "inventory" | "order" | "product" | "auth" | "user";
  entityId: string;
  action: string;
  actor: {
    userId?: mongoose.Types.ObjectId;
    role?: string;
    ip?: string;
    userAgent?: string;
  };
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    action: { type: String, required: true, index: true },
    actor: {
      userId: { type: Schema.Types.ObjectId, ref: "user" },
      role: String,
      ip: String,
      userAgent: String,
    },
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });

const AuditLog =
  (mongoose.models.audit_log as Model<IAuditLog>) ??
  mongoose.model<IAuditLog>("audit_log", auditLogSchema);

export default AuditLog;

