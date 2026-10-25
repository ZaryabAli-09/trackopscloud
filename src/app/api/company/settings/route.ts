import { Types } from "mongoose";
import { z } from "zod";
import { defineRoute } from "@/lib/api/define-route";
import { AppError, successResponse } from "@/lib/api/response";
import { AuditLog } from "@/models/AuditLog";
import { Company } from "@/models/Company";

const bodySchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  contactNumber: z.string().trim().max(50).nullable().optional(),
  businessAddress: z.string().trim().max(500).nullable().optional(),
  defaultCurrency: z.string().regex(/^[A-Z]{3}$/).optional(),
  defaultLowStockThreshold: z.number().int().nonnegative().optional(),
  allowCreditSales: z.boolean().optional(),
  allowCustomNegativeStock: z.boolean().optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one setting is required");

export const GET = defineRoute(
  { scope: "company", roles: ["company_admin", "company_employee"] },
  async (_request, { auth }) => {
    const company = await Company.findById(auth!.companyId).select("name email contactNumber businessAddress logo settings status");
    if (!company) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Company not found" });
    return successResponse(company, "Company settings retrieved successfully");
  },
);

export const PATCH = defineRoute(
  { scope: "company", roles: ["company_admin"], bodySchema },
  async (_request, { auth, body }) => {
    const company = await Company.findById(auth!.companyId);
    if (!company) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Company not found" });
    if (body.name !== undefined) company.name = body.name;
    if (body.contactNumber !== undefined) company.contactNumber = body.contactNumber;
    if (body.businessAddress !== undefined) company.businessAddress = body.businessAddress;
    for (const key of ["defaultCurrency", "defaultLowStockThreshold", "allowCreditSales", "allowCustomNegativeStock"] as const) {
      if (body[key] !== undefined) company.set(`settings.${key}`, body[key]);
    }
    await company.save();
    await AuditLog.create({ userId: new Types.ObjectId(auth!.userId), companyId: company._id, action: "company.settings.update", entityType: "Company", entityId: company._id, metadata: { fields: Object.keys(body) } });
    return successResponse(company, "Company settings updated successfully");
  },
);
