import { defineRoute } from "@/lib/api/define-route";
import { AppError, successResponse } from "@/lib/api/response";
import { Company } from "@/models/Company";
import { User } from "@/models/User";
import { Product } from "@/models/Product";
import { Sale } from "@/models/Sale";

export const GET = defineRoute(
  { scope: "platform", roles: ["platform_admin"] },
  async (_request, { params }) => {
    const company = await Company.findById(params.id).lean();
    if (!company) throw new AppError({ status: 404, code: "NOT_FOUND", message: "Company not found" });
    const [users, productCount, saleCount] = await Promise.all([
      User.find({ companyId: company._id }).select("email firstName lastName role isActive lastLoginAt").sort({ createdAt: 1 }).lean(),
      Product.countDocuments({ companyId: company._id, isArchived: false }),
      Sale.countDocuments({ companyId: company._id, paymentStatus: { $ne: "voided" } }),
    ]);
    return successResponse({ company, users, productCount, saleCount }, "Company retrieved successfully");
  },
);
