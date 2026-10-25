import { Types } from "mongoose";
import { z } from "zod";
import { defineRoute } from "@/lib/api/define-route";
import { createdResponse, successResponse } from "@/lib/api/response";
import { listMeta } from "@/lib/api/list";
import { createSale } from "@/lib/ledger";
import { paginationSchema, saleSchema } from "@/lib/validation/schemas";
import { Sale } from "@/models/Sale";

const querySchema = paginationSchema.extend({
  customerId: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
  paymentStatus: z.enum(["pending", "partial", "paid", "overdue", "voided"]).optional(),
});

export const GET = defineRoute(
  { scope: "company", roles: ["company_admin", "company_employee"], querySchema },
  async (_request, { auth, query }) => {
    const filter = {
      companyId: auth!.companyId!,
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.paymentStatus ? { paymentStatus: query.paymentStatus } : {}),
    };
    const [sales, total] = await Promise.all([
      Sale.find(filter).populate("customerId", "name phone").populate("recordedBy", "firstName lastName email").sort({ saleDate: -1, createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
      Sale.countDocuments(filter),
    ]);
    return successResponse(sales, "Sales retrieved successfully", listMeta(query.page, query.limit, total));
  },
);

export const POST = defineRoute(
  { scope: "company", roles: ["company_admin"], bodySchema: saleSchema },
  async (_request, { auth, body }) => {
    const sale = await createSale({
      companyId: new Types.ObjectId(auth!.companyId!),
      customerId: body.customerId ? new Types.ObjectId(body.customerId) : null,
      items: body.items.map((item) => ({ productId: new Types.ObjectId(item.productId), quantity: item.quantity, discount: item.discount })),
      amountPaid: body.amountPaid,
      notes: body.notes,
      recordedBy: new Types.ObjectId(auth!.userId),
      saleDate: body.saleDate ? new Date(body.saleDate) : new Date(),
    });
    return createdResponse(sale, "Sale recorded successfully");
  },
);
