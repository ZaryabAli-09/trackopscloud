import { Types } from "mongoose";
import { z } from "zod";
import { defineRoute } from "@/lib/api/define-route";
import { successResponse } from "@/lib/api/response";
import { escapeRegex, listMeta } from "@/lib/api/list";
import { paginationSchema } from "@/lib/validation/schemas";
import { Company } from "@/models/Company";
import { User } from "@/models/User";

const querySchema = paginationSchema.extend({
  status: z.enum(["pending", "approved", "rejected", "suspended"]).optional(),
  search: z.string().max(100).optional(),
});

export const GET = defineRoute(
  { scope: "platform", roles: ["platform_admin"], querySchema },
  async (_request, { query }) => {
    const search = query.search ? new RegExp(escapeRegex(query.search), "i") : null;
    const filter = {
      ...(query.status ? { status: query.status } : {}),
      ...(search ? { $or: [{ name: search }, { email: search }] } : {}),
    };
    type Row = { _id: Types.ObjectId; name: string; email: string; status: string; createdAt: Date; logoUrl?: string | null };
    const [companies, total] = await Promise.all([
      Company.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean<Row[]>(),
      Company.countDocuments(filter),
    ]);
    const ids = companies.map((company) => company._id);
    const counts: Array<{ _id: Types.ObjectId; count: number }> = await User.aggregate([
      { $match: { companyId: { $in: ids } } },
      { $group: { _id: "$companyId", count: { $sum: 1 } } },
    ]);
    const countById = new Map(counts.map(({ _id, count }) => [_id.toString(), count]));
    const data = companies.map((company) => ({ ...company, userCount: countById.get(company._id.toString()) ?? 0 }));
    return successResponse(data, "Companies retrieved successfully", listMeta(query.page, query.limit, total));
  },
);
