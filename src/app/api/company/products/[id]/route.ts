import { NextRequest } from "next/server";
import { withAuth } from "@/lib/permissions";
import { errorResponse, successResponse, handleError } from "@/lib/api/response";
import { Product } from "@/models/Product";
import { connectToDatabase } from "@/lib/db/connection";
import { productUpdateSchema } from "@/lib/validation/schemas";

async function handler(req: NextRequest, ctx: import("@/lib/permissions").AuthorizedRequestContext, context: { params: Promise<{ [key: string]: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;

    const product = await Product.findOne({
      _id: id,
      companyId: ctx.companyId || "",
      isArchived: false,
    });
    if (!product) {
      return errorResponse({ status: 404, code: "NOT_FOUND", message: "Product not found" });
    }

    if (req.method === "PUT") {
      const body = await req.json();
      const validated = productUpdateSchema.parse(body);

      if (validated.sku) {
        const existing = await Product.findOne({
          companyId: ctx.companyId || "",
          sku: validated.sku.toUpperCase(),
          _id: { $ne: id },
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

      const updated = await Product.findByIdAndUpdate(
        { _id: id, companyId: ctx.companyId || "" },
        { ...validated, updatedAt: new Date() },
        { new: true }
      );
      return successResponse(updated, "Product updated successfully");
    }

    if (req.method === "DELETE") {
      const deleted = await Product.findOneAndUpdate(
        { _id: id, companyId: ctx.companyId || "", isArchived: false },
        { isArchived: true, updatedAt: new Date() },
        { new: true }
      );

      if (!deleted) {
        return errorResponse({ status: 404, code: "NOT_FOUND", message: "Product not found" });
      }

      return successResponse(null, "Product soft-deleted successfully");
    }

    return successResponse(product, "Product retrieved successfully");
  } catch (error) {
    return handleError(error, "unknown");
  }
}

export const GET = withAuth(handler);
export const PUT = withAuth(handler);
export const DELETE = withAuth(handler);