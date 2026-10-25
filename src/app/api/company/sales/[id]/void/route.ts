import { Types } from "mongoose";
import { z } from "zod";
import { defineRoute } from "@/lib/api/define-route";
import { successResponse } from "@/lib/api/response";
import { voidSale } from "@/lib/ledger";

const bodySchema = z.object({ reason: z.string().trim().min(1).max(500) });

export const POST = defineRoute(
  { scope: "company", roles: ["company_admin"], bodySchema },
  async (_request, { auth, params, body }) => {
    await voidSale({ companyId: new Types.ObjectId(auth!.companyId!), saleId: new Types.ObjectId(params.id), voidedBy: new Types.ObjectId(auth!.userId), voidReason: body.reason });
    return successResponse(null, "Sale voided successfully");
  },
);
