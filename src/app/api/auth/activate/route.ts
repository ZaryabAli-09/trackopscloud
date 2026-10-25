import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import { defineRoute } from "@/lib/api/define-route";
import { AppError, successResponse } from "@/lib/api/response";
import { clientAddress, limitRate } from "@/lib/auth/rate-limit";
import { hashToken } from "@/lib/auth/tokens";
import { connectToDatabase } from "@/lib/db/connection";
import { passwordResetSchema } from "@/lib/validation/schemas";
import { AccountActivationToken } from "@/models/AccountActivationToken";
import { AuditLog } from "@/models/AuditLog";
import { Company } from "@/models/Company";
import { User } from "@/models/User";

const bodySchema = z.object({ token: z.string().min(1), password: passwordResetSchema.shape.password });

export const POST = defineRoute(
  { scope: "public", bodySchema },
  async (request, { body }) => {
    await limitRate("activation", clientAddress(request));
    await connectToDatabase();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const token = await AccountActivationToken.findOneAndUpdate({ token: hashToken(body.token), isUsed: false, expiresAt: { $gt: new Date() } }, { $set: { isUsed: true } }, { new: true, session });
        if (!token) throw new AppError({ status: 400, code: "INVALID_OR_EXPIRED_TOKEN", message: "Invalid or expired activation token" });
        const company = await Company.findOne({ _id: token.companyId, status: "approved" }).session(session);
        if (!company) throw new AppError({ status: 403, code: "COMPANY_NOT_APPROVED", message: "Company is not approved" });
        const user = await User.findOne({ _id: token.userId, companyId: company._id }).session(session);
        if (!user) throw new AppError({ status: 400, code: "INVALID_OR_EXPIRED_TOKEN", message: "Invalid or expired activation token" });
        user.password = await bcrypt.hash(body.password, 12);
        user.isActive = true;
        user.emailVerified = true;
        user.sessionVersion += 1;
        await user.save({ session });
        company.isEmailVerified = true;
        await company.save({ session });
        await AuditLog.create([{ userId: user._id, companyId: company._id, userEmail: user.email, userRole: user.role, action: "account.activate", entityType: "User", entityId: user._id }], { session });
      });
    } finally { await session.endSession(); }
    return successResponse(null, "Account activated successfully. You can now sign in.");
  },
);
