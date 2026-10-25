import { z } from "zod";
import { defineRoute } from "@/lib/api/define-route";
import { successResponse } from "@/lib/api/response";
import { listMeta } from "@/lib/api/list";
import { paginationSchema } from "@/lib/validation/schemas";
import { StockMovement } from "@/models/StockMovement";

const querySchema = paginationSchema.extend({
  productId: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
  movementType: z.enum(["opening_stock", "stock_addition", "stock_reduction", "stock_adjustment", "sale_reduction", "customer_return"]).optional(),
});

export const GET = defineRoute(
  { scope: "company", roles: ["company_admin", "company_employee"], querySchema },
  async (_request, { auth, query }) => {
    const filter = {
      companyId: auth!.companyId!,
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.movementType ? { movementType: query.movementType } : {}),
    };
    const [movements, total] = await Promise.all([
      StockMovement.find(filter).populate("productId", "name sku").populate("userId", "firstName lastName email").sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
      StockMovement.countDocuments(filter),
    ]);
    return successResponse(movements, "Stock movements retrieved successfully", listMeta(query.page, query.limit, total));
  },
);
