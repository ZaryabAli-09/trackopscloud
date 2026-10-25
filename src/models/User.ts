import mongoose, { Schema, Document, model, Model, Types } from "mongoose";

export type Role = "platform_admin" | "company_admin" | "company_employee";

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: Role;
  companyId?: Types.ObjectId | null;
  isActive: boolean;
  emailVerified: boolean;
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  sessionVersion: number;
  lastLoginAt?: Date | null;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    role: {
      type: String,
      enum: ["platform_admin", "company_admin", "company_employee"],
      required: true,
    },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", default: null },
    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    emailVerificationToken: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },
    sessionVersion: { type: Number, default: 1 },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ companyId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

export const User: Model<IUser> = mongoose.models.User || model<IUser>("User", userSchema);