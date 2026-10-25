import { z } from "zod";
import { defineRoute } from "@/lib/api/define-route";
import { createdResponse, successResponse } from "@/lib/api/response";
import { escapeRegex, listMeta } from "@/lib/api/list";
import { customerSchema, paginationSchema } from "@/lib/validation/schemas";
import { Customer } from "@/models/Customer";

const querySchema = paginationSchema.extend({ search: z.string().max(100).optional() });

export const GET = defineRoute(
  { scope: "company", roles: ["company_admin", "company_employee"], querySchema },
  async (_request, { auth, query }) => {
    const companyId = auth!.companyId!;
    const filter = { companyId, ...(query.search ? { name: new RegExp(escapeRegex(query.search), "i") } : {}) };
    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ createdAt: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
      Customer.countDocuments(filter),
    ]);
    return successResponse(customers, "Customers retrieved successfully", listMeta(query.page, query.limit, total));
  },
);

export const POST = defineRoute(
  { scope: "company", roles: ["company_admin"], bodySchema: customerSchema },
  async (_request, { auth, body }) => {
    const customer = await Customer.create({ ...body, companyId: auth!.companyId! });
    return createdResponse(customer, "Customer created successfully");
  },
);
