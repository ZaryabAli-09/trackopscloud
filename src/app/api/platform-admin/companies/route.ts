import { NextRequest } from "next/server";
import { withAuth } from "@/lib/permissions";
import { errorResponse, successResponse } from "@/lib/api/response";
import { paginationSchema } from "@/lib/validation/schemas";
import { Company } from "@/models/Company";
import { User } from "@/models/User";
import { connectToDatabase } from "@/lib/db/connection";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["pending", "approved", "rejected", "suspended"]).optional(),
  search: z.string().optional(),
});

async function handler(req: NextRequest, ctx: any) {
  if (ctx.userRole !== "platform_admin") {
    return errorResponse({ status: 403, code: "FORBIDDEN", message: "Platform admin access required" });
  }

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const query = querySchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
      status: searchParams.get("status"),
      search: searchParams.get("search"),
    });

    const filter: any = {};
    if (query.status) filter.status = query.status;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: "i" } },
        { email: { $regex: query.search, $options: "i" } },
      ];
    }

    const [companies, total] = await Promise.all([
      Company.find(filter)
        .sort({ createdAt: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Company.countDocuments(filter),
    ]);

    // Get user counts for each company
    const companyIds = companies.map((c: any) => c._id);
    const userCounts = await User.aggregate([
      { $match: { companyId: { $in: companyIds } } },
      { $group: { _id: "$companyId", count: { $sum: 1 } } },
    ]);
    const userCountMap = new Map(userCounts.map((u: any) => [u._id.toString(), u.count]));

    const data = companies.map((company: any) => ({
      ...company,
      userCount: userCountMap.get(company._id.toString()) || 0,
    }));

    return successResponse({
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    }, "Companies retrieved successfully");
  } catch (error) {
    throw error;
  }
}

export const GET = withAuth(handler as any) as any;