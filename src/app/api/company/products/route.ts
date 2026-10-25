import { NextRequest } from "next/server";
import { withAuth } from "@/lib/permissions";
import { errorResponse, successResponse, createdResponse, handleError } from "@/lib/api/response";
import { Product } from "@/models/Product";
import { connectToDatabase } from "@/lib/db/connection";
import { productSchema, productUpdateSchema, paginationSchema } from "@/lib/validation/schemas";
import { z } from "zod";

async function handler(req: NextRequest, ctx: import("@/lib/permissions").AuthorizedRequestContext, context: { params: Promise<{ [key: string]: string }> }) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const query = paginationSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
    });

    const includeArchived = searchParams.get("includeArchived") === "true";

    const filter: { companyId: string; isArchived?: boolean } = {
      companyId: ctx.companyId || "",
    };
    if (!includeArchived) {
      filter.isArchived = false;
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ [query.sortBy || "createdAt"]: query.sortOrder === "asc" ? 1 : -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    return successResponse({
      data: products,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    }, "Products retrieved successfully");
  } catch (error) {
    return handleError(error, "unknown");
  }
}

async function postHandler(req: NextRequest, ctx: import("@/lib/permissions").AuthorizedRequestContext, context: { params: Promise<{ [key: string]: string }> }) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const validated = productSchema.parse(body);

    // Check for duplicate SKU within company
    const existing = await Product.findOne({
      companyId: ctx.companyId || "",
      sku: validated.sku.toUpperCase(),
      isArchived: false,
    });
    if (existing) {
      return errorResponse({
        status: 409,
        code: "DUPLICATE_SKU",
        message: "A product with this SKU already exists",
      });
    }

    const product = await Product.create({
      ...validated,
      sku: validated.sku.toUpperCase(),
      companyId: ctx.companyId || "",
    });

    return createdResponse(product, "Product created successfully");
  } catch (error) {
    return handleError(error, "unknown");
  }
}

export const GET = withAuth(handler);
export const POST = withAuth(postHandler);