import { NextRequest } from "next/server";
import { withAuth } from "@/lib/permissions";
import { errorResponse, successResponse } from "@/lib/api/response";
import { StockMovement } from "@/models/StockMovement";
import { connectToDatabase } from "@/lib/db/connection";
import { paginationSchema } from "@/lib/validation/schemas";

async function handler(req: NextRequest, ctx: any) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const query = paginationSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    const filter: any = { companyId: ctx.companyId };

    const [movements, total] = await Promise.all([
      StockMovement.find(filter)
        .populate("productId", "name sku")
        .populate("userId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      StockMovement.countDocuments(filter),
    ]);

    return successResponse({
      data: movements,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    }, "Stock movements retrieved successfully");
  } catch (error) {
    throw error;
  }
}

export const GET = withAuth(handler as any) as any;