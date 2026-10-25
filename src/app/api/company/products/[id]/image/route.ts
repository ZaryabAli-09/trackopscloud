import { randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { defineRoute } from "@/lib/api/define-route";
import { AppError, successResponse } from "@/lib/api/response";
import { deleteImage, getCompanyFolder, uploadImage, validateFile } from "@/lib/cloudinary";
import { AuditLog } from "@/models/AuditLog";
import { Product } from "@/models/Product";

export const POST = defineRoute(
  { scope: "company", roles: ["company_admin"] },
  async (request, { auth, params }) => {
    const companyId = auth!.companyId!;
    const product = await Product.findOne({ _id: params.id, companyId, isArchived: false });
    if (!product) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Product not found" });
    const formData = await request.formData();
    const file = formData.get("image");
    if (!(file instanceof File)) throw new AppError({ status: 400, code: "FILE_REQUIRED", message: "Product image is required" });
    validateFile(file, file.type, file.size);
    const uploaded = await uploadImage(Buffer.from(await file.arrayBuffer()), { folder: getCompanyFolder(companyId, "items"), fileName: randomUUID(), mimeType: file.type });
    const oldPublicId = product.imagePublicId;
    try {
      product.imageUrl = uploaded.secureUrl;
      product.imagePublicId = uploaded.publicId;
      await product.save();
    } catch (error) {
      await deleteImage(uploaded.publicId);
      throw error;
    }
    if (oldPublicId && oldPublicId !== uploaded.publicId) await deleteImage(oldPublicId);
    await AuditLog.create({ userId: new Types.ObjectId(auth!.userId), companyId: new Types.ObjectId(companyId), action: "product.image.replace", entityType: "Product", entityId: product._id });
    return successResponse({ imageUrl: product.imageUrl }, "Product image updated successfully");
  },
);
