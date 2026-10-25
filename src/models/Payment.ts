import mongoose, { Schema, Document, model, Model, Types } from "mongoose";

export interface IPayment extends Document {
  companyId: Types.ObjectId;
  saleId: Types.ObjectId;
  customerId?: Types.ObjectId | null;
  amount: number;
  paymentDate: Date;
  paymentMethod: "cash" | "bank_transfer" | "check" | "mobile_money" | "other";
  referenceNumber?: string | null;
  notes?: string | null;
  recordedBy: Types.ObjectId;
}

const paymentSchema = new Schema<IPayment>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    saleId: { type: Schema.Types.ObjectId, ref: "Sale", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null },
    amount: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    paymentDate: { type: Date, required: true, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ["cash", "bank_transfer", "check", "mobile_money", "other"],
      default: "cash",
    },
    referenceNumber: { type: String, trim: true, default: null },
    notes: { type: String, trim: true, maxlength: 1000, default: null },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

paymentSchema.index({ companyId: 1 });
paymentSchema.index({ companyId: 1, saleId: 1 });
paymentSchema.index({ companyId: 1, paymentDate: -1 });

export const Payment: Model<IPayment> = mongoose.models.Payment || model<IPayment>("Payment", paymentSchema);
