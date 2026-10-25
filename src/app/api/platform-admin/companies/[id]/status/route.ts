import { NextRequest } from "next/server";
import { withAuth } from "@/lib/permissions";
import { errorResponse, successResponse } from "@/lib/api/response";
import { Company } from "@/models/Company";
import { User } from "@/models/User";
import { AccountActivationToken } from "@/models/AccountActivationToken";
import { AuditLog } from "@/models/AuditLog";
import { connectToDatabase } from "@/lib/db/connection";
import bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { companyStatusUpdateSchema } from "@/lib/validation/schemas";
import { sendEmail, companyApprovedEmail, companyRejectedEmail, companySuspendedEmail, companyReactivatedEmail } from "@/lib/email";
import { appConfig } from "@/config/app.config";

async function handler(req: NextRequest, ctx: any, { params }: { params: { id: string } }) {
  if (ctx.userRole !== "platform_admin") {
    return errorResponse({ status: 403, code: "FORBIDDEN", message: "Platform admin access required" });
  }

  try {
    await connectToDatabase();

    const company = await Company.findById(params.id);
    if (!company) {
      return errorResponse({ status: 404, code: "NOT_FOUND", message: "Company not found" });
    }

    const body = await req.json();
    const { status, rejectionReason } = companyStatusUpdateSchema.parse(body);

    if (company.status === status) {
      return errorResponse({ status: 409, code: "CONFLICT", message: `Company is already ${status}` });
    }

    const previousStatus = company.status;
    company.status = status;

    if (status === "approved") {
      company.approvedAt = new Date();
      company.approvedBy = ctx.userId;
      company.rejectionReason = null;
      company.rejectedAt = null;
      company.rejectedBy = null;
    } else if (status === "rejected") {
      company.rejectedAt = new Date();
      company.rejectedBy = ctx.userId;
      company.rejectionReason = rejectionReason ?? null;
      company.approvedAt = null;
      company.approvedBy = null;
    } else if (status === "suspended") {
      company.suspendedAt = new Date();
      company.suspendedBy = ctx.userId;
      company.suspensionReason = rejectionReason ?? null;
    } else if (status === "pending") {
      // Reactivate from rejected/suspended to pending
      company.suspendedAt = null;
      company.suspendedBy = null;
      company.suspensionReason = null;
      company.rejectedAt = null;
      company.rejectedBy = null;
      company.rejectionReason = null;
    }

    await company.save();

    // Audit log
    await AuditLog.create({
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      userRole: ctx.userRole,
      companyId: company._id,
      action: `company.${status}`,
      entityType: "Company",
      entityId: company._id,
      metadata: { previousStatus, newStatus: status, rejectionReason },
      ipAddress: (req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined) as string | undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    // Send notification emails
    try {
      const appUrl = process.env.APP_URL || "http://localhost:3000";
      const adminUser = await User.findOne({ companyId: company._id, role: "company_admin" });

      if (status === "approved" && adminUser) {
        // Create activation token
        const activationToken = crypto.randomBytes(32).toString("hex");
        const activationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await AccountActivationToken.create({
          userId: adminUser._id,
          companyId: company._id,
          token: activationToken,
          expiresAt: activationExpires,
          isUsed: false,
        });

        const setupUrl = `${appUrl}/auth/activate?token=${activationToken}`;
        await sendEmail(companyApprovedEmail(company.name, company.email, setupUrl));
      } else if (status === "rejected") {
        await sendEmail(companyRejectedEmail(company.name, company.email, rejectionReason));
      } else if (status === "suspended") {
        await sendEmail(companySuspendedEmail(company.name, company.email, rejectionReason));
      } else if (status === "pending") {
        await sendEmail(companyReactivatedEmail(company.name, company.email));
      }
    } catch (emailError) {
      console.error("Failed to send notification email:", emailError);
    }

    return successResponse(null, `Company ${status} successfully`);
  } catch (error) {
    throw error;
  }
}

export const POST = withAuth(handler as any) as any;