import { NextRequest } from "next/server";
import { withAuth } from "@/lib/permissions";
import { errorResponse, successResponse, createdResponse } from "@/lib/api/response";
import { createSale } from "@/lib/ledger";
import { saleSchema, paginationSchema } from "@/lib/validation/schemas";
import { Sale } from "@/models/Sale";
import { connectToDatabase } from "@/lib/db/connection";
import { Types } from "mongoose";

async function handler(req: NextRequest, ctx: any) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const query = paginationSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    const filter: any = { companyId: ctx.companyId };

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
    throw error;
  }
}

async function postHandler(req: NextRequest, ctx: any) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const validated = saleSchema.parse(body);

    const sale = await createSale({
      companyId: new Types.ObjectId(ctx.companyId as string),
      customerId: validated.customerId ? new Types.ObjectId(validated.customerId) : null,
      items: validated.items.map((item: any) => ({
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
      recordedBy: new Types.ObjectId(ctx.userId as string),
      saleDate: new Date(),
    });

    return createdResponse(sale, "Sale recorded successfully");
  } catch (error) {
    throw error;
  }
}

export const GET = withAuth(handler as any) as any;
export const POST = withAuth(postHandler as any) as any;