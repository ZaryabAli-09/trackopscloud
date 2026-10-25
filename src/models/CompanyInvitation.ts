import mongoose, { Schema, Document, model, Model, Types } from "mongoose";

export interface ICompanyInvitation extends Document {
  email: string;
  firstName: string;
  lastName: string;
  companyId: Types.ObjectId;
  invitedBy: Types.ObjectId;
  role: "company_employee";
  token: string;
  expiresAt: Date;
  isAccepted: boolean;
  acceptedAt?: Date | null;
}

const companyInvitationSchema = new Schema<ICompanyInvitation>(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["company_employee"], required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    isAccepted: { type: Boolean, default: false },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

companyInvitationSchema.index({ token: 1 }, { unique: true });
companyInvitationSchema.index({ companyId: 1 });
companyInvitationSchema.index({ email: 1 });
companyInvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const CompanyInvitation: Model<ICompanyInvitation> =
  mongoose.models.CompanyInvitation || model<ICompanyInvitation>("CompanyInvitation", companyInvitationSchema);
