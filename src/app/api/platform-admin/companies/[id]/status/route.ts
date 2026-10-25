import mongoose, { Types } from "mongoose";
import { appConfig } from "@/config/app.config";
import { defineRoute } from "@/lib/api/define-route";
import { AppError, successResponse } from "@/lib/api/response";
import { createToken } from "@/lib/auth/tokens";
import { companyApprovedEmail, companyReactivatedEmail, companyRejectedEmail, companySuspendedEmail, sendEmail } from "@/lib/email";
import { companyStatusUpdateSchema } from "@/lib/validation/schemas";
import { AccountActivationToken } from "@/models/AccountActivationToken";
import { AuditLog } from "@/models/AuditLog";
import { Company, type CompanyStatus } from "@/models/Company";
import { User } from "@/models/User";

export const POST = defineRoute(
  { scope: "platform", roles: ["platform_admin"], bodySchema: companyStatusUpdateSchema },
  async (request, { auth, body, params, correlationId }) => {
    const session = await mongoose.startSession();
    let transition: { companyName: string; email: string; previous: CompanyStatus; token: string | null } | null = null;
    try {
      transition = await session.withTransaction(async () => {
        const company = await Company.findById(params.id).session(session);
        if (!company) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Company not found" });
        if (company.status === body.status) return null;
        const previous = company.status;
        const allowed = (body.status === "approved" && ["pending", "rejected", "suspended"].includes(previous)) ||
          (body.status === "rejected" && previous === "pending") ||
          (body.status === "suspended" && previous === "approved");
        if (!allowed) throw new AppError({ status: 409, code: "INVALID_STATUS_CHANGE", message: "This status change is not allowed" });

        company.status = body.status;
        if (body.status === "approved") {
          company.approvedAt = new Date();
          company.approvedBy = new Types.ObjectId(auth!.userId);
          company.rejectionReason = null;
          company.suspensionReason = null;
          company.suspendedAt = null;
        } else if (body.status === "rejected") {
          company.rejectedAt = new Date();
          company.rejectedBy = new Types.ObjectId(auth!.userId);
          company.rejectionReason = body.reason ?? null;
        } else {
          company.suspendedAt = new Date();
          company.suspendedBy = new Types.ObjectId(auth!.userId);
          company.suspensionReason = body.reason ?? null;
        }
        await company.save({ session });
        await User.updateMany({ companyId: company._id }, { $inc: { sessionVersion: 1 } }, { session });

        let token: string | null = null;
        if (body.status === "approved" && previous !== "suspended") {
          const admin = await User.findOneAndUpdate({ companyId: company._id, role: "company_admin" }, { $set: { isActive: true } }, { new: true, session });
          if (!admin) throw new AppError({ status: 409, code: "ADMIN_MISSING", message: "Company administrator is missing" });
          await AccountActivationToken.updateMany({ userId: admin._id, isUsed: false }, { $set: { isUsed: true } }, { session });
          const issued = createToken();
          token = issued.raw;
          await AccountActivationToken.create([{ userId: admin._id, companyId: company._id, token: issued.hash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), isUsed: false }], { session });
        }
        await AuditLog.create([{ userId: new Types.ObjectId(auth!.userId), userEmail: auth!.userEmail, userRole: "platform_admin", companyId: company._id, action: `company.${body.status}`, entityType: "Company", entityId: company._id, metadata: { previousStatus: previous, newStatus: body.status, reason: body.reason ?? null }, ipAddress: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip"), userAgent: request.headers.get("user-agent") }], { session });
        return { companyName: company.name, email: company.email, previous, token };
      });
    } finally { await session.endSession(); }

    if (!transition) return successResponse(null, `Company is already ${body.status}`);
    const { companyName, email, previous, token } = transition;
    try {
      if (body.status === "approved" && previous === "suspended") await sendEmail(companyReactivatedEmail(companyName, email));
      else if (body.status === "approved" && token) await sendEmail(companyApprovedEmail(companyName, email, `${appConfig.url}/activate?token=${token}`));
      else if (body.status === "rejected") await sendEmail(companyRejectedEmail(companyName, email, body.reason));
      else if (body.status === "suspended") await sendEmail(companySuspendedEmail(companyName, email, body.reason));
    } catch (error) {
      console.error(`[${correlationId}] Company status updated but notification email failed`, error);
      throw new AppError({ status: 502, code: "EMAIL_DELIVERY_FAILED", message: "Company status changed, but the notification email could not be sent" });
    }
    return successResponse(null, `Company ${body.status} successfully`);
  },
);
