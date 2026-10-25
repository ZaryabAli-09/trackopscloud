import { NextRequest } from "next/server";
import { withCorrelationId, errorResponse, successResponse } from "@/lib/api/response";
import { connectToDatabase } from "@/lib/db/connection";
import { User } from "@/models/User";
import { Company } from "@/models/Company";
import { AccountActivationToken } from "@/models/AccountActivationToken";
import bcrypt from "bcryptjs";
import { tokenQuerySchema, passwordResetSchema } from "@/lib/validation/schemas";
import { AuditLog } from "@/models/AuditLog";
import { z } from "zod";
import * as crypto from "crypto";

const activateBodySchema = z.object({
  token: z.string().min(1),
  password: passwordResetSchema.shape.password,
});

async function handler(req: NextRequest, correlationId: string) {
  try {
    const body = await req.json();
    const { token, password } = activateBodySchema.parse(body);

    await connectToDatabase();

    // Find valid, unused activation token
    const activationToken = await AccountActivationToken.findOne({
      token,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!activationToken) {
      return errorResponse({
        status: 400,
        code: "INVALID_OR_EXPIRED_TOKEN",
        message: "Invalid or expired activation token",
      });
    }

    const user = await User.findById(activationToken.userId);
    if (!user) {
      return errorResponse({
        status: 404,
        code: "USER_NOT_FOUND",
        message: "User not found",
      });
    }
    if (user.isActive === true) {
      // User already active, but still mark token as used
      activationToken.isUsed = true;
      await activationToken.save();
      return successResponse(null, "Account is already active. You can sign in.");
    }

    // Activate user
    user.isActive = true;
    user.emailVerified = true;
    user.sessionVersion = (user.sessionVersion || 1) + 1; // Invalidate old sessions
    await user.save();

    // Activate company
    const company = await Company.findById(activationToken.companyId);
    if (company && company.status === "pending") {
      company.status = "approved";
      company.approvedAt = new Date();
      company.approvedBy = user._id;
      company.isEmailVerified = true;
      await company.save();
    }

    // Mark token as used
    activationToken.isUsed = true;
    await activationToken.save();

    // Audit log
    await AuditLog.create({
      userId: user._id,
      companyId: user.companyId,
      userEmail: user.email,
      userRole: user.role,
      action: "account.activate",
      entityType: "User",
      entityId: user._id,
      metadata: { companyStatus: company?.status },
    });

    return successResponse(null, "Account activated successfully. You can now sign in.");
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "ZodError") {
        return errorResponse({
          status: 400,
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: (error as any).errors?.map((e: any) => ({ path: e.path.join("."), message: e.message })) || [],
        });
      }
    }
    throw error;
  }
}

export const POST = withCorrelationId(handler as any);