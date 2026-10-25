import { Types } from "mongoose";
import { defineRoute } from "@/lib/api/define-route";
import { AppError, successResponse } from "@/lib/api/response";
import { getCustomerOutstandingBalance } from "@/lib/ledger";
import { customerUpdateSchema } from "@/lib/validation/schemas";
import { AuditLog } from "@/models/AuditLog";
import { Customer } from "@/models/Customer";
import { Payment } from "@/models/Payment";
import { Sale } from "@/models/Sale";

export const GET = defineRoute(
  { scope: "company", roles: ["company_admin", "company_employee"] },
  async (_request, { auth, params }) => {
    const companyId = auth!.companyId!;
    const customer = await Customer.findOne({ _id: params.id, companyId }).lean();
    if (!customer) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Customer not found" });
    const [sales, payments, balance] = await Promise.all([
      Sale.find({ companyId, customerId: params.id }).sort({ saleDate: -1 }).limit(25).lean(),
      Payment.find({ companyId, customerId: params.id }).sort({ paymentDate: -1 }).limit(25).lean(),
      getCustomerOutstandingBalance(new Types.ObjectId(companyId), new Types.ObjectId(params.id)),
    ]);
    return successResponse({ customer, sales, payments, balance }, "Customer retrieved successfully");
  },
);

export const PATCH = defineRoute(
  { scope: "company", roles: ["company_admin"], bodySchema: customerUpdateSchema },
  async (_request, { auth, params, body }) => {
    if (!Object.keys(body).length) throw new AppError({ status: 400, code: "VALIDATION_ERROR", message: "At least one field is required" });
    const customer = await Customer.findOneAndUpdate({ _id: params.id, companyId: auth!.companyId }, { $set: body }, { new: true, runValidators: true });
    if (!customer) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Customer not found" });
    await AuditLog.create({ userId: new Types.ObjectId(auth!.userId), companyId: new Types.ObjectId(auth!.companyId!), action: "customer.update", entityType: "Customer", entityId: customer._id });
    return successResponse(customer, "Customer updated successfully");
  },
);
