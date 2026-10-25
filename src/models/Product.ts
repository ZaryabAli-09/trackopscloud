import mongoose, { Schema, Document, model, Model, Types } from "mongoose";

export interface IProduct extends Document {
  companyId: Types.ObjectId;
  name: string;
  sku: string;
  description?: string | null;
  category?: string | null;
  unitOfMeasurement: string;
  packageSize?: string | null;
  sellingPrice: number;
  costPrice?: number | null;
  currentStock: number;
  lowStockThreshold: number;
  imageUrl?: string | null;
  imagePublicId?: string | null;
  isArchived: boolean;
}

const productSchema = new Schema<IProduct>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 50 },
    description: { type: String, trim: true, maxlength: 1000, default: null },
    category: { type: String, trim: true, maxlength: 100, default: null },
    unitOfMeasurement: { type: String, required: true, trim: true, maxlength: 50 },
    packageSize: { type: String, trim: true, maxlength: 100, default: null },
    sellingPrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, min: 0, default: null },
    currentStock: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, required: true, min: 0, default: 0 },
    imageUrl: { type: String, default: null },
    imagePublicId: { type: String, default: null },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

productSchema.index({ companyId: 1, sku: 1 }, { unique: true });
productSchema.index({ companyId: 1, isArchived: 1 });
productSchema.index({ companyId: 1, name: 1 });

export const Product: Model<IProduct> = mongoose.models.Product || model<IProduct>("Product", productSchema);