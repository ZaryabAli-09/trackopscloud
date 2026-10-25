import { z } from "zod";
import { defineRoute } from "@/lib/api/define-route";
import { successResponse } from "@/lib/api/response";
import { escapeRegex, listMeta } from "@/lib/api/list";
import { paginationSchema } from "@/lib/validation/schemas";
import { User } from "@/models/User";

const querySchema = paginationSchema.extend({
  role: z.enum(["platform_admin", "company_admin", "company_employee"]).optional(),
  search: z.string().max(100).optional(),
});

export const GET = defineRoute(
  { scope: "platform", roles: ["platform_admin"], querySchema },
  async (_request, { query }) => {
    const search = query.search ? new RegExp(escapeRegex(query.search), "i") : null;
    const filter = { ...(query.role ? { role: query.role } : {}), ...(search ? { $or: [{ email: search }, { firstName: search }, { lastName: search }] } : {}) };
    const [users, total] = await Promise.all([
      User.find(filter).select("email firstName lastName role companyId isActive emailVerified lastLoginAt createdAt").populate("companyId", "name status").sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
      User.countDocuments(filter),
    ]);
    return successResponse(users, "Users retrieved successfully", listMeta(query.page, query.limit, total));
  },
);
