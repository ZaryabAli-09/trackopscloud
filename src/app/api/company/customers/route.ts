import { NextRequest } from "next/server";
import { withAuth } from "@/lib/permissions";
import { errorResponse, successResponse, createdResponse } from "@/lib/api/response";
import { Customer } from "@/models/Customer";
import { connectToDatabase } from "@/lib/db/connection";
import { customerSchema, customerUpdateSchema, paginationSchema } from "@/lib/validation/schemas";

async function handler(req: NextRequest, ctx: any) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const query = paginationSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    const filter: any = { companyId: ctx.companyId };

    const [customers, total] = await Promise.all([
      Customer.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Customer.countDocuments(filter),
    ]);

    return successResponse({
      data: customers,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    }, "Customers retrieved successfully");
  } catch (error) {
    throw error;
  }
}

async function postHandler(req: NextRequest, ctx: any) {
  try {
    await connectToDatabase();
    const body = await req.json();
    const validated = customerSchema.parse(body);

    const customer = await Customer.create({ ...validated, companyId: ctx.companyId });
    return createdResponse(customer, "Customer created successfully");
  } catch (error) {
    throw error;
  }
}

export const GET = withAuth(handler as any) as any;
export const POST = withAuth(postHandler as any) as any;