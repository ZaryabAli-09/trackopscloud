import { defineRoute } from "@/lib/api/define-route";
import { AppError, successResponse } from "@/lib/api/response";
import { Sale } from "@/models/Sale";
import { Payment } from "@/models/Payment";
import { StockMovement } from "@/models/StockMovement";

export const GET = defineRoute(
  { scope: "company", roles: ["company_admin", "company_employee"] },
  async (_request, { auth, params }) => {
    const companyId = auth!.companyId!;
    const sale = await Sale.findOne({ _id: params.id, companyId }).populate("customerId", "name phone").lean();
    if (!sale) throw new AppError({ status: 404, code: "SALE_NOT_FOUND", message: "Sale not found" });
    const [payments, movements] = await Promise.all([
      Payment.find({ companyId, saleId: params.id }).sort({ paymentDate: -1 }).lean(),
      StockMovement.find({ companyId, referenceType: "sale", referenceId: params.id }).sort({ createdAt: 1 }).lean(),
    ]);
    return successResponse({ sale, payments, movements }, "Sale retrieved successfully");
  },
);
