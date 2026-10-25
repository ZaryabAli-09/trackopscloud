import mongoose, { Schema, Document, model, Model, Types } from "mongoose";

export interface ISaleItem {
  productId: Types.ObjectId;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  lineTotal: number;
}

export interface ISale extends Document {
  companyId: Types.ObjectId;
  saleNumber: string;
  customerId?: Types.ObjectId | null;
  items: ISaleItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paymentStatus: "pending" | "partial" | "paid" | "overdue" | "voided";
  amountPaid: number;
  outstandingBalance: number;
  notes?: string | null;
  recordedBy: Types.ObjectId;
  saleDate: Date;
  voidedAt?: Date | null;
  voidedBy?: Types.ObjectId | null;
  voidReason?: string | null;
  correctedFrom?: Types.ObjectId | null;
}

const saleItemSchema = new Schema<ISaleItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true, trim: true },
    sku: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    discount: { type: Number, required: true, min: 0, default: 0, validate: Number.isSafeInteger },
    lineTotal: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  },
  { _id: false }
);

const saleSchema = new Schema<ISale>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    saleNumber: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null },
    items: [saleItemSchema],
    subtotal: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    discountTotal: { type: Number, required: true, min: 0, default: 0, validate: Number.isSafeInteger },
    taxTotal: { type: Number, required: true, min: 0, default: 0, validate: Number.isSafeInteger },
    grandTotal: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    paymentStatus: {
      type: String,
      enum: ["pending", "partial", "paid", "overdue", "voided"],
      default: "pending",
    },
    amountPaid: { type: Number, required: true, min: 0, default: 0, validate: Number.isSafeInteger },
    outstandingBalance: { type: Number, required: true, min: 0, default: 0, validate: Number.isSafeInteger },
    notes: { type: String, trim: true, maxlength: 1000, default: null },
    recordedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    saleDate: { type: Date, required: true, default: Date.now },
    voidedAt: { type: Date, default: null },
    voidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    voidReason: { type: String, default: null },
    correctedFrom: { type: Schema.Types.ObjectId, ref: "Sale", default: null },
  },
  { timestamps: true }
);

saleSchema.index({ companyId: 1, saleNumber: 1 }, { unique: true });
saleSchema.index({ companyId: 1, saleDate: -1 });
saleSchema.index({ companyId: 1, customerId: 1 });
saleSchema.index({ companyId: 1, paymentStatus: 1 });

export const Sale: Model<ISale> = mongoose.models.Sale || model<ISale>("Sale", saleSchema);
