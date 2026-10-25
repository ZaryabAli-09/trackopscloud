import mongoose, { Schema, Document, model, Model, Types } from "mongoose";

export interface IAuditLog extends Document {
  userId?: Types.ObjectId | null;
  userEmail?: string | null;
  userRole?: string | null;
  companyId?: Types.ObjectId | null;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    userEmail: { type: String, default: null },
    userRole: { type: String, default: null },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", default: null },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, required: true, trim: true },
    entityId: { type: Schema.Types.ObjectId, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true }
);

auditLogSchema.index({ companyId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || model<IAuditLog>("AuditLog", auditLogSchema);