import { appConfig } from "@/config/app.config";
import { defineRoute } from "@/lib/api/define-route";
import { AppError, successResponse } from "@/lib/api/response";
import { limitRate } from "@/lib/auth/rate-limit";
import { createToken } from "@/lib/auth/tokens";
import { employeeInvitationEmail, sendEmail } from "@/lib/email";
import { AuditLog } from "@/models/AuditLog";
import { Company } from "@/models/Company";
import { CompanyInvitation } from "@/models/CompanyInvitation";

export const POST = defineRoute(
  { scope: "company", roles: ["company_admin"] },
  async (_request, { auth, params, correlationId }) => {
    const companyId = auth!.companyId!;
    await limitRate("invitations", companyId);
    const company = await Company.findById(companyId).select("name");
    const invitation = await CompanyInvitation.findOne({ _id: params.id, companyId, isAccepted: false });
    if (!company || !invitation) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Invitation not found" });
    const token = createToken();
    invitation.token = token.hash;
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await invitation.save();
    await AuditLog.create({ userId: auth!.userId, companyId, action: "employee.invite.resend", entityType: "CompanyInvitation", entityId: invitation._id });
    try { await sendEmail(employeeInvitationEmail(company.name, invitation.email, auth!.userEmail, `${appConfig.url}/accept-invitation?token=${token.raw}`)); }
    catch (error) {
      console.error(`[${correlationId}] Invitation resend email failed`, error);
      throw new AppError({ status: 502, code: "EMAIL_DELIVERY_FAILED", message: "Invitation email could not be sent" });
    }
    return successResponse(null, "Invitation resent successfully");
  },
);
