import { z } from "zod";
import { appConfig } from "@/config/app.config";
import { defineRoute } from "@/lib/api/define-route";
import { AppError, createdResponse, successResponse } from "@/lib/api/response";
import { escapeRegex, listMeta } from "@/lib/api/list";
import { limitRate } from "@/lib/auth/rate-limit";
import { createToken } from "@/lib/auth/tokens";
import { employeeInvitationEmail, sendEmail } from "@/lib/email";
import { inviteEmployeeSchema, paginationSchema } from "@/lib/validation/schemas";
import { AuditLog } from "@/models/AuditLog";
import { Company } from "@/models/Company";
import { CompanyInvitation } from "@/models/CompanyInvitation";
import { User } from "@/models/User";

const querySchema = paginationSchema.extend({ search: z.string().max(100).optional() });

export const GET = defineRoute(
  { scope: "company", roles: ["company_admin", "company_employee"], querySchema },
  async (_request, { auth, query }) => {
    const search = query.search ? new RegExp(escapeRegex(query.search), "i") : null;
    const filter = { companyId: auth!.companyId!, role: "company_employee" as const, ...(search ? { $or: [{ firstName: search }, { lastName: search }, { email: search }] } : {}) };
    const [employees, total] = await Promise.all([
      User.find(filter).select("email firstName lastName isActive lastLoginAt createdAt").sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
      User.countDocuments(filter),
    ]);
    return successResponse(employees, "Employees retrieved successfully", listMeta(query.page, query.limit, total));
  },
);

export const POST = defineRoute(
  { scope: "company", roles: ["company_admin"], bodySchema: inviteEmployeeSchema },
  async (_request, { auth, body, correlationId }) => {
    const companyId = auth!.companyId!;
    await limitRate("invitations", companyId);
    const email = body.email.toLowerCase();
    if (await User.exists({ email })) throw new AppError({ status: 409, code: "DUPLICATE_USER", message: "An account with this email already exists" });
    if (await CompanyInvitation.exists({ companyId, email, isAccepted: false, expiresAt: { $gt: new Date() } })) {
      throw new AppError({ status: 409, code: "INVITATION_EXISTS", message: "An active invitation already exists" });
    }
    const company = await Company.findById(companyId).select("name");
    if (!company) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Company not found" });
    const token = createToken();
    const invitation = await CompanyInvitation.create({ companyId, email, firstName: body.firstName, lastName: body.lastName, invitedBy: auth!.userId, role: "company_employee", token: token.hash, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), isAccepted: false });
    await AuditLog.create({ userId: auth!.userId, companyId, action: "employee.invite", entityType: "CompanyInvitation", entityId: invitation._id, metadata: { email } });
    try { await sendEmail(employeeInvitationEmail(company.name, email, auth!.userEmail, `${appConfig.url}/accept-invitation?token=${token.raw}`)); }
    catch (error) {
      console.error(`[${correlationId}] Employee invitation saved but email failed`, error);
      throw new AppError({ status: 502, code: "EMAIL_DELIVERY_FAILED", message: "Invitation was saved, but the email could not be sent" });
    }
    return createdResponse({ id: invitation._id.toString() }, "Invitation sent successfully");
  },
);
