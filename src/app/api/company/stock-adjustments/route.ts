import { Types } from "mongoose";
import { defineRoute } from "@/lib/api/define-route";
import { createdResponse } from "@/lib/api/response";
import { recordStockAdjustment } from "@/lib/ledger";
import { withDatabaseTransaction } from "@/lib/db/transaction";
import { stockAdjustmentSchema } from "@/lib/validation/schemas";
import { AuditLog } from "@/models/AuditLog";
import { Product } from "@/models/Product";

export const POST = defineRoute(
  { scope: "company", roles: ["company_admin"], bodySchema: stockAdjustmentSchema },
  async (_request, { auth, body }) => {
    const companyId = new Types.ObjectId(auth!.companyId!);
    const userId = new Types.ObjectId(auth!.userId);
    const productId = new Types.ObjectId(body.productId);
    const adjustmentId = new Types.ObjectId();
    await withDatabaseTransaction(async (session) => {
        await recordStockAdjustment({ companyId, userId, productId, movementType: body.movementType, quantity: body.quantity, referenceType: "adjustment", referenceId: adjustmentId, notes: body.notes }, session);
        await AuditLog.create([{ userId, companyId, action: "stock.adjust", entityType: "Product", entityId: productId, metadata: { adjustmentId, movementType: body.movementType, quantity: body.quantity } }], { session });
    });
    const product = await Product.findOne({ _id: productId, companyId });
    return createdResponse(product, "Stock adjusted successfully");
  },
);
