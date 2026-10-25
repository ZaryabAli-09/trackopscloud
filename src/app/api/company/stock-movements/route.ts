import { NextRequest } from "next/server";
import { withAuth } from "@/lib/permissions";
import { errorResponse, successResponse, handleError } from "@/lib/api/response";
import { StockMovement } from "@/models/StockMovement";
import { connectToDatabase } from "@/lib/db/connection";
import { paginationSchema } from "@/lib/validation/schemas";

async function handler(req: NextRequest, ctx: import("@/lib/permissions").AuthorizedRequestContext, context: { params: Promise<{ [key: string]: string }> }) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const query = paginationSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    const filter: { companyId: string } = { companyId: ctx.companyId || "" };

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
    return handleError(error, "unknown");
  }
}

export const GET = withAuth(handler);