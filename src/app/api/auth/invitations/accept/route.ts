import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { z } from "zod";
import { defineRoute } from "@/lib/api/define-route";
import { AppError, successResponse } from "@/lib/api/response";
import { clientAddress, limitRate } from "@/lib/auth/rate-limit";
import { hashToken } from "@/lib/auth/tokens";
import { connectToDatabase } from "@/lib/db/connection";
import { passwordResetSchema } from "@/lib/validation/schemas";
import { AuditLog } from "@/models/AuditLog";
import { Company } from "@/models/Company";
import { CompanyInvitation } from "@/models/CompanyInvitation";
import { User } from "@/models/User";

const bodySchema = z.object({ token: z.string().min(1), password: passwordResetSchema.shape.password });

export const POST = defineRoute(
  { scope: "public", bodySchema },
  async (request, { body }) => {
    await limitRate("invitation-accept", clientAddress(request));
    await connectToDatabase();
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const invitation = await CompanyInvitation.findOneAndUpdate({ token: hashToken(body.token), isAccepted: false, expiresAt: { $gt: new Date() } }, { $set: { isAccepted: true, acceptedAt: new Date() } }, { new: true, session });
        if (!invitation) throw new AppError({ status: 400, code: "INVALID_OR_EXPIRED_TOKEN", message: "Invalid or expired invitation" });
        const company = await Company.findOne({ _id: invitation.companyId, status: "approved" }).session(session);
        if (!company) throw new AppError({ status: 403, code: "COMPANY_NOT_APPROVED", message: "Company is not approved" });
        if (await User.exists({ email: invitation.email }).session(session)) throw new AppError({ status: 409, code: "DUPLICATE_USER", message: "An account with this email already exists" });
        const password = await bcrypt.hash(body.password, 12);
        const [user] = await User.create([{ email: invitation.email, password, firstName: invitation.firstName, lastName: invitation.lastName, role: "company_employee", companyId: company._id, isActive: true, emailVerified: true, sessionVersion: 1 }], { session });
        await Company.updateOne({ _id: company._id }, { $inc: { userCount: 1 } }, { session });
        await AuditLog.create([{ userId: user._id, companyId: company._id, userEmail: user.email, userRole: user.role, action: "employee.invitation.accept", entityType: "User", entityId: user._id }], { session });
      });
    } finally { await session.endSession(); }
    return successResponse(null, "Invitation accepted. You can now sign in.");
  },
);
