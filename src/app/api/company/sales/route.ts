import { NextRequest } from "next/server";
import { withAuth } from "@/lib/permissions";
import { errorResponse, successResponse, createdResponse, handleError } from "@/lib/api/response";
import { createSale } from "@/lib/ledger";
import { saleSchema, paginationSchema } from "@/lib/validation/schemas";
import { Sale } from "@/models/Sale";
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

    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .populate("customerId", "name phone")
        .populate("recordedBy", "firstName lastName email")
        .sort({ saleDate: -1, createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Sale.countDocuments(filter),
    ]);

    return successResponse({
      data: sales,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    }, "Sales retrieved successfully");
  } catch (error) {
    return handleError(error, "unknown");
  }
}

async function postHandler(req: NextRequest, ctx: import("@/lib/permissions").AuthorizedRequestContext, context: { params: Promise<{ [key: string]: string }> }) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const validated = saleSchema.parse(body);

    const sale = await createSale({
      companyId: new Types.ObjectId(ctx.companyId || ""),
      customerId: validated.customerId ? new Types.ObjectId(validated.customerId) : null,
      items: validated.items.map((item: { productId: string; productName: string; sku: string; quantity: number; unitPrice: number; discount: number }) => ({
        productId: new Types.ObjectId(item.productId),
        productName: item.productName,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
      })),
      paymentStatus: validated.paymentStatus,
      amountPaid: validated.amountPaid,
      notes: validated.notes,
      recordedBy: new Types.ObjectId(ctx.userId || ""),
      saleDate: new Date(),
    });

    if (!sale) {
      return errorResponse({ status: 500, code: "INTERNAL_ERROR", message: "Failed to record sale" });
    }

    return createdResponse(sale, "Sale recorded successfully");
  } catch (error) {
    return handleError(error, "unknown");
  }
}

export const GET = withAuth(handler);
export const POST = withAuth(postHandler);