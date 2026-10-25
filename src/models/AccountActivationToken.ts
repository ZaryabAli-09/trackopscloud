import mongoose, { Schema, Document, model, Model, Types } from "mongoose";

export interface IAccountActivationToken extends Document {
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  token: string;
  expiresAt: Date;
  isUsed: boolean;
}

const accountActivationTokenSchema = new Schema<IAccountActivationToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyId: { type: Schema.Types.ObjectId, ref: "Company", required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

accountActivationTokenSchema.index({ token: 1 }, { unique: true });
accountActivationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AccountActivationToken: Model<IAccountActivationToken> =
  mongoose.models.AccountActivationToken || model<IAccountActivationToken>("AccountActivationToken", accountActivationTokenSchema);