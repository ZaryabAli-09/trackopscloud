import mongoose, { Types } from "mongoose";
import { z } from "zod";
import { defineRoute } from "@/lib/api/define-route";
import { createdResponse, successResponse } from "@/lib/api/response";
import { escapeRegex, listMeta } from "@/lib/api/list";
import { recordStockAdjustment } from "@/lib/ledger";
import { paginationSchema, productSchema } from "@/lib/validation/schemas";
import { AuditLog } from "@/models/AuditLog";
import { Product } from "@/models/Product";

const querySchema = paginationSchema.extend({
  search: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  status: z.enum(["active", "archived", "all"]).default("active"),
});

export const GET = defineRoute(
  { scope: "company", roles: ["company_admin", "company_employee"], querySchema },
  async (_request, { auth, query }) => {
    const filter = {
      companyId: auth!.companyId!,
      ...(query.status !== "all" ? { isArchived: query.status === "archived" } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.search ? { $or: [{ name: new RegExp(escapeRegex(query.search), "i") }, { sku: new RegExp(escapeRegex(query.search), "i") }] } : {}),
    };
    const sortKey = ["createdAt", "name", "sku", "sellingPrice", "currentStock"].includes(query.sortBy ?? "") ? query.sortBy! : "createdAt";
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ [sortKey]: query.sortOrder === "asc" ? 1 : -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
      Product.countDocuments(filter),
    ]);
    return successResponse(products, "Products retrieved successfully", listMeta(query.page, query.limit, total));
  },
);

export const POST = defineRoute(
  { scope: "company", roles: ["company_admin"], bodySchema: productSchema },
  async (_request, { auth, body }) => {
    const companyId = new Types.ObjectId(auth!.companyId!);
    const userId = new Types.ObjectId(auth!.userId);
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const { openingStock, ...fields } = body;
        const docs = await Product.create([{ ...fields, sku: fields.sku.toUpperCase(), companyId, currentStock: 0, isArchived: false }], { session });
        if (openingStock > 0) {
          await recordStockAdjustment({ companyId, userId, productId: docs[0]._id, movementType: "opening_stock", quantity: openingStock, referenceType: "opening", referenceId: docs[0]._id }, session);
        }
        await AuditLog.create([{ userId, companyId, action: "product.create", entityType: "Product", entityId: docs[0]._id }], { session });
      });
    } finally { await session.endSession(); }
    return createdResponse(await Product.findOne({ companyId, sku: body.sku.toUpperCase() }), "Product created successfully");
  },
);
