import mongoose, { Schema, Document, model, Model, Types } from "mongoose";

export type CompanyStatus = "pending" | "approved" | "rejected" | "suspended";

export interface ICompany extends Document {
  name: string;
  email: string;
  status: CompanyStatus;
  contactNumber?: string | null;
  businessAddress?: string | null;
  logoUrl?: string | null;
  logoPublicId?: string | null;
  logo?: { publicId: string; url: string } | null;
  isEmailVerified: boolean;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  approvedAt?: Date | null;
  approvedBy?: Types.ObjectId | null;
  rejectedAt?: Date | null;
  rejectedBy?: Types.ObjectId | null;
  rejectionReason?: string | null;
  suspendedAt?: Date | null;
  suspendedBy?: Types.ObjectId | null;
  suspensionReason?: string | null;
  settings?: {
    allowCreditSales: boolean;
    allowCustomNegativeStock: boolean;
    defaultLowStockThreshold: number;
    taxRate?: number;
    defaultCurrency: string;
  };
  saleCounter: number;
  userCount: number;
  productCount: number;
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
      required: true,
    },
    contactNumber: { type: String, trim: true, default: null },
    businessAddress: { type: String, trim: true, default: null },
    logoUrl: { type: String, default: null },
    logoPublicId: { type: String, default: null },
    logo: { publicId: { type: String }, url: { type: String } },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    rejectionReason: { type: String, default: null },
    suspendedAt: { type: Date, default: null },
    suspendedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    suspensionReason: { type: String, default: null },
    settings: {
      allowCreditSales: { type: Boolean, default: true },
      allowCustomNegativeStock: { type: Boolean, default: false },
      defaultLowStockThreshold: { type: Number, default: 0, min: 0 },
      taxRate: { type: Number, default: 0 },
      defaultCurrency: { type: String, default: "USD" },
    },
    userCount: { type: Number, default: 0 },
    productCount: { type: Number, default: 0 },
    saleCounter: { type: Number, default: 0 },
  },
  { timestamps: true }
);

companySchema.index({ email: 1 }, { unique: true });
companySchema.index({ status: 1 });
companySchema.index({ name: 1 });

export const Company: Model<ICompany> =
  mongoose.models.Company || model<ICompany>("Company", companySchema);
