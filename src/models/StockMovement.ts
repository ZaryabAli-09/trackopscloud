import mongoose, { Schema, Document, model, Model, Types } from "mongoose";

export type StockMovementType =
  | "opening_stock"
  | "stock_addition"
  | "stock_reduction"
  | "stock_adjustment"
  | "sale_reduction"
  | "customer_return";

export interface IStockMovement extends Document {
  companyId: Types.ObjectId;
  productId: Types.ObjectId;
  movementType: StockMovementType;
  quantity: number;
  previousQuantity: number;
  resultingQuantity: number;
  referenceType: "sale" | "adjustment" | "opening" | "return";
  referenceId?: Types.ObjectId | null;
  userId: Types.ObjectId;
  notes?: string | null;
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    movementType: {
      type: String,
      enum: [
        "opening_stock",
        "stock_addition",
        "stock_reduction",
        "stock_adjustment",
        "sale_reduction",
        "customer_return",
      ],
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    previousQuantity: { type: Number, required: true, min: 0 },
    resultingQuantity: { type: Number, required: true, min: 0 },
    referenceType: {
      type: String,
      enum: ["sale", "adjustment", "opening", "return"],
      required: true,
    },
    referenceId: { type: Schema.Types.ObjectId, default: null },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notes: { type: String, trim: true, maxlength: 1000, default: null },
  },
  { timestamps: true }
);

stockMovementSchema.index({ companyId: 1 });
stockMovementSchema.index({ companyId: 1, productId: 1 });
stockMovementSchema.index({ companyId: 1, createdAt: -1 });
stockMovementSchema.index({ companyId: 1, movementType: 1 });

export const StockMovement: Model<IStockMovement> =
  mongoose.models.StockMovement || model<IStockMovement>("StockMovement", stockMovementSchema);