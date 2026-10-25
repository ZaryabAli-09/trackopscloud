import { NextRequest } from "next/server";
import { withAuth } from "@/lib/permissions";
import { errorResponse, successResponse, createdResponse } from "@/lib/api/response";
import { recordPayment } from "@/lib/ledger";
import { recordPaymentSchema, paginationSchema } from "@/lib/validation/schemas";
import { Payment } from "@/models/Payment";
import { connectToDatabase } from "@/lib/db/connection";
import { Types } from "mongoose";

async function handler(req: NextRequest, ctx: import("@/lib/permissions").AuthorizedRequestContext, context: { params: Promise<{ [key: string]: string }> }) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const query = paginationSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    const filter: { companyId: string } = { companyId: ctx.companyId || "" };

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate("saleId", "saleNumber grandTotal")
        .populate("customerId", "name")
        .populate("recordedBy", "firstName lastName email")
        .sort({ paymentDate: -1, createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    return successResponse({
      data: payments,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    }, "Payments retrieved successfully");
  } catch (error) {
    throw error;
  }
}

async function postHandler(req: NextRequest, ctx: import("@/lib/permissions").AuthorizedRequestContext, context: { params: Promise<{ [key: string]: string }> }) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const validated = recordPaymentSchema.parse(body);

    // Verify the sale belongs to the company
    const Sale = (await import("@/models/Sale")).Sale;
    const sale = await Sale.findOne({ _id: validated.saleId, companyId: ctx.companyId || "" });
    if (!sale) {
      return errorResponse({ status: 404, code: "NOT_FOUND", message: "Sale not found" });
    }

    const customerIdValue = sale.customerId ? new Types.ObjectId(sale.customerId.toString()) : new Types.ObjectId();

    await recordPayment({
      companyId: new Types.ObjectId(ctx.companyId || ""),
      saleId: new Types.ObjectId(validated.saleId),
      customerId: customerIdValue,
      amount: validated.amount,
      paymentDate: validated.paymentDate ? new Date(validated.paymentDate) : new Date(),
      paymentMethod: "cash",
      referenceNumber: validated.referenceNumber ?? null,
      notes: validated.notes ?? null,
      recordedBy: new Types.ObjectId(ctx.userId || ""),
    });

    return createdResponse(null, "Payment recorded successfully");
  } catch (error) {
    throw error;
  }
}

export const GET = withAuth(handler);
export const POST = withAuth(postHandler);