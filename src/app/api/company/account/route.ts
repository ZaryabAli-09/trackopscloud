import bcrypt from "bcryptjs";
import { z } from "zod";
import { defineRoute } from "@/lib/api/define-route";
import { AppError, successResponse } from "@/lib/api/response";
import { AuditLog } from "@/models/AuditLog";
import { User } from "@/models/User";

const bodySchema = z.object({
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).optional(),
}).superRefine((value, context) => {
  if (value.newPassword && !value.currentPassword) context.addIssue({ code: "custom", path: ["currentPassword"], message: "Current password is required" });
  if (!value.firstName && !value.lastName && !value.newPassword) context.addIssue({ code: "custom", message: "No account change was provided" });
});

export const GET = defineRoute(
  { scope: "company", roles: ["company_admin", "company_employee"] },
  async (_request, { auth }) => {
    const user = await User.findOne({ _id: auth!.userId, companyId: auth!.companyId }).select("email firstName lastName role lastLoginAt");
    if (!user) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Account not found" });
    return successResponse(user, "Account retrieved successfully");
  },
);

export const PATCH = defineRoute(
  { scope: "company", roles: ["company_admin", "company_employee"], bodySchema },
  async (_request, { auth, body }) => {
    const user = await User.findOne({ _id: auth!.userId, companyId: auth!.companyId }).select("+password");
    if (!user) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Account not found" });
    if (body.newPassword) {
      if (!await bcrypt.compare(body.currentPassword!, user.password)) throw new AppError({ status: 400, code: "INVALID_PASSWORD", message: "Current password is incorrect" });
      user.password = await bcrypt.hash(body.newPassword, 12);
      user.sessionVersion += 1;
    }
    if (body.firstName) user.firstName = body.firstName;
    if (body.lastName) user.lastName = body.lastName;
    await user.save();
    await AuditLog.create({ userId: user._id, companyId: user.companyId, action: "account.update", entityType: "User", entityId: user._id, metadata: { passwordChanged: !!body.newPassword } });
    return successResponse({ id: user._id.toString(), firstName: user.firstName, lastName: user.lastName, email: user.email }, "Account updated successfully");
  },
);
