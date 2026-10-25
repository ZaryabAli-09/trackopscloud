import { Types } from "mongoose";
import { z } from "zod";
import { defineRoute } from "@/lib/api/define-route";
import { createdResponse, successResponse } from "@/lib/api/response";
import { listMeta } from "@/lib/api/list";
import { recordPayment } from "@/lib/ledger";
import { paginationSchema, recordPaymentSchema } from "@/lib/validation/schemas";
import { Payment } from "@/models/Payment";

const querySchema = paginationSchema.extend({ saleId: z.string().regex(/^[0-9a-f]{24}$/i).optional(), customerId: z.string().regex(/^[0-9a-f]{24}$/i).optional() });

export const GET = defineRoute(
  { scope: "company", roles: ["company_admin", "company_employee"], querySchema },
  async (_request, { auth, query }) => {
    const filter = { companyId: auth!.companyId!, ...(query.saleId ? { saleId: query.saleId } : {}), ...(query.customerId ? { customerId: query.customerId } : {}) };
    const [payments, total] = await Promise.all([
      Payment.find(filter).populate("saleId", "saleNumber grandTotal").populate("customerId", "name").populate("recordedBy", "firstName lastName email").sort({ paymentDate: -1, createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
      Payment.countDocuments(filter),
    ]);
    return successResponse(payments, "Payments retrieved successfully", listMeta(query.page, query.limit, total));
  },
);

export const POST = defineRoute(
  { scope: "company", roles: ["company_admin"], bodySchema: recordPaymentSchema },
  async (_request, { auth, body }) => {
    const payment = await recordPayment({
      companyId: new Types.ObjectId(auth!.companyId!),
      saleId: new Types.ObjectId(body.saleId),
      amount: body.amount,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      paymentMethod: "cash",
      referenceNumber: body.referenceNumber,
      notes: body.notes,
      recordedBy: new Types.ObjectId(auth!.userId),
    });
    return createdResponse(payment, "Payment recorded successfully");
  },
);
