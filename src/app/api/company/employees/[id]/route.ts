import { Types } from "mongoose";
import { defineRoute } from "@/lib/api/define-route";
import { AppError, successResponse } from "@/lib/api/response";
import { AuditLog } from "@/models/AuditLog";
import { User } from "@/models/User";

export const DELETE = defineRoute(
  { scope: "company", roles: ["company_admin"] },
  async (_request, { auth, params }) => {
    const employee = await User.findOneAndUpdate({ _id: params.id, companyId: auth!.companyId, role: "company_employee", isActive: true }, { $set: { isActive: false }, $inc: { sessionVersion: 1 } }, { returnDocument: "after" });
    if (!employee) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Active employee not found" });
    await AuditLog.create({ userId: new Types.ObjectId(auth!.userId), companyId: new Types.ObjectId(auth!.companyId!), action: "employee.deactivate", entityType: "User", entityId: employee._id });
    return successResponse(null, "Employee deactivated successfully");
  },
);
