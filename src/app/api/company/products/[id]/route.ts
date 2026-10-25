import { Types } from "mongoose";
import { defineRoute } from "@/lib/api/define-route";
import { AppError, successResponse } from "@/lib/api/response";
import { productUpdateSchema } from "@/lib/validation/schemas";
import { AuditLog } from "@/models/AuditLog";
import { Product } from "@/models/Product";

export const GET = defineRoute(
  { scope: "company", roles: ["company_admin", "company_employee"] },
  async (_request, { auth, params }) => {
    const product = await Product.findOne({ _id: params.id, companyId: auth!.companyId, isArchived: false });
    if (!product) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Product not found" });
    return successResponse(product, "Product retrieved successfully");
  },
);

const updateProduct = defineRoute(
  { scope: "company", roles: ["company_admin"], bodySchema: productUpdateSchema },
  async (_request, { auth, params, body }) => {
    const fields = { ...body, ...(body.sku ? { sku: body.sku.toUpperCase() } : {}) };
    const product = await Product.findOneAndUpdate({ _id: params.id, companyId: auth!.companyId, isArchived: false }, { $set: fields }, { returnDocument: "after", runValidators: true });
    if (!product) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Product not found" });
    await AuditLog.create({ userId: new Types.ObjectId(auth!.userId), companyId: new Types.ObjectId(auth!.companyId!), action: "product.update", entityType: "Product", entityId: product._id });
    return successResponse(product, "Product updated successfully");
  },
);

export const PATCH = updateProduct;
export const PUT = updateProduct;

export const DELETE = defineRoute(
  { scope: "company", roles: ["company_admin"] },
  async (_request, { auth, params }) => {
    const product = await Product.findOneAndUpdate({ _id: params.id, companyId: auth!.companyId, isArchived: false }, { $set: { isArchived: true } }, { returnDocument: "after" });
    if (!product) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Product not found" });
    await AuditLog.create({ userId: new Types.ObjectId(auth!.userId), companyId: new Types.ObjectId(auth!.companyId!), action: "product.archive", entityType: "Product", entityId: product._id });
    return successResponse(null, "Product archived successfully");
  },
);
