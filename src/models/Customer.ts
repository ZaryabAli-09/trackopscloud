import mongoose, { Schema, Document, model, Model, Types } from "mongoose";

export interface ICustomer extends Document {
  companyId: Types.ObjectId;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

const customerSchema = new Schema<ICustomer>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    phone: { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, trim: true, lowercase: true, default: null },
    address: { type: String, trim: true, maxlength: 500, default: null },
    notes: { type: String, trim: true, maxlength: 1000, default: null },
  },
  { timestamps: true }
);

customerSchema.index({ companyId: 1 });
customerSchema.index({ companyId: 1, name: 1 });

export const Customer: Model<ICustomer> = mongoose.models.Customer || model<ICustomer>("Customer", customerSchema);