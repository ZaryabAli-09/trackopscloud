import { defineRoute } from "@/lib/api/define-route";
import { AppError, successResponse } from "@/lib/api/response";
import { StockMovement } from "@/models/StockMovement";

export const GET = defineRoute(
  { scope: "company", roles: ["company_admin", "company_employee"] },
  async (_request, { auth, params }) => {
    const movement = await StockMovement.findOne({ _id: params.id, companyId: auth!.companyId }).populate("productId", "name sku").lean();
    if (!movement) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Stock movement not found" });
    return successResponse(movement, "Stock movement retrieved successfully");
  },
);
