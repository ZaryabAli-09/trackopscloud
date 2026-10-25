import { z } from "zod";
import { defineRoute } from "@/lib/api/define-route";
import { successResponse } from "@/lib/api/response";
import { escapeRegex, listMeta } from "@/lib/api/list";
import { paginationSchema } from "@/lib/validation/schemas";
import { AuditLog } from "@/models/AuditLog";

const querySchema = paginationSchema.extend({
  companyId: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
  action: z.string().max(100).optional(),
  userEmail: z.string().max(100).optional(),
});

export const GET = defineRoute(
  { scope: "platform", roles: ["platform_admin"], querySchema },
  async (_request, { query }) => {
    const filter = {
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.action ? { action: new RegExp(escapeRegex(query.action), "i") } : {}),
      ...(query.userEmail ? { userEmail: new RegExp(escapeRegex(query.userEmail), "i") } : {}),
    };
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
      AuditLog.countDocuments(filter),
    ]);
    return successResponse(logs, "Audit logs retrieved successfully", listMeta(query.page, query.limit, total));
  },
);
