import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { defineRoute } from "@/lib/api/define-route";
import { AppError, successResponse } from "@/lib/api/response";
import { deleteImage, getCompanyFolder, uploadImage, validateFile } from "@/lib/cloudinary";
import { AuditLog } from "@/models/AuditLog";
import { Company } from "@/models/Company";

export const POST = defineRoute(
  { scope: "company", roles: ["company_admin"] },
  async (request, { auth }) => {
    const companyId = auth!.companyId!;
    const company = await Company.findById(companyId);
    if (!company) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Company not found" });
    const formData = await request.formData();
    const file = formData.get("logo");
    if (!(file instanceof File)) throw new AppError({ status: 400, code: "FILE_REQUIRED", message: "Logo file is required" });
    validateFile(file, file.type, file.size);
    const uploaded = await uploadImage(Buffer.from(await file.arrayBuffer()), { folder: getCompanyFolder(companyId, "logos"), fileName: randomUUID(), mimeType: file.type });
    const oldPublicId = company.logo?.publicId ?? company.logoPublicId;
    try {
      company.logo = { publicId: uploaded.publicId, url: uploaded.secureUrl };
      company.logoUrl = uploaded.secureUrl;
      company.logoPublicId = uploaded.publicId;
      await company.save();
    } catch (error) {
      await deleteImage(uploaded.publicId);
      throw error;
    }
    if (oldPublicId && oldPublicId !== uploaded.publicId) await deleteImage(oldPublicId);
    await AuditLog.create({ userId: new Types.ObjectId(auth!.userId), companyId: new Types.ObjectId(companyId), action: "company.logo.replace", entityType: "Company", entityId: company._id });
    return successResponse(company.logo, "Company logo updated successfully");
  },
);
