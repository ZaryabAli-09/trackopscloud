import { NextRequest } from "next/server";
import { withAuth } from "@/lib/permissions";
import { errorResponse, successResponse } from "@/lib/api/response";
import { Product } from "@/models/Product";
import { connectToDatabase } from "@/lib/db/connection";
import { productUpdateSchema } from "@/lib/validation/schemas";

async function handler(req: NextRequest, ctx: any, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();

    const product = await Product.findOne({ _id: params.id, companyId: ctx.companyId });
    if (!product) {
      return errorResponse({ status: 404, code: "NOT_FOUND", message: "Product not found" });
    }

    if (req.method === "GET") {
      return successResponse(product, "Product retrieved successfully");
    }

    if (req.method === "PUT") {
      const body = await req.json();
      const validated = productUpdateSchema.parse(body);

      if (validated.sku) {
        const existing = await Product.findOne({
          companyId: ctx.companyId,
          sku: validated.sku.toUpperCase(),
          _id: { $ne: params.id },
          isArchived: false,
        });
        if (existing) {
          return errorResponse({
            status: 409,
            code: "DUPLICATE_SKU",
            message: "A product with this SKU already exists",
          });
        }
        validated.sku = validated.sku.toUpperCase();
      }

      const updated = await Product.findByIdAndUpdate(params.id, validated, { new: true });
      return successResponse(updated, "Product updated successfully");
    }

    if (req.method === "DELETE") {
      await Product.findByIdAndUpdate(params.id, { isArchived: true });
      return successResponse(null, "Product archived successfully");
    }

    return errorResponse({ status: 405, code: "METHOD_NOT_ALLOWED", message: "Method not allowed" });
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "CastError") {
        return errorResponse({ status: 400, code: "INVALID_ID", message: "Invalid product ID" });
      }
    }
    throw error;
  }
}

export const GET = withAuth(handler as any);
export const PUT = withAuth(handler as any);
export const DELETE = withAuth(handler as any);