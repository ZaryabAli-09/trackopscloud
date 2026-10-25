import { NextRequest } from "next/server";
import { withCorrelationId, errorResponse, successResponse } from "@/lib/api/response";
import { connectToDatabase } from "@/lib/db/connection";
import { User } from "@/models/User";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import bcrypt from "bcryptjs";
import { passwordResetSchema } from "@/lib/validation/schemas";
import { AuditLog } from "@/models/AuditLog";

async function handler(req: NextRequest, correlationId: string) {
  try {
    const body = await req.json();
    const { token, password } = passwordResetSchema.parse(body);

    await connectToDatabase();

    const resetToken = await PasswordResetToken.findOne({
      token,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetToken) {
      return errorResponse({
        status: 400,
        code: "INVALID_OR_EXPIRED_TOKEN",
        message: "Invalid or expired reset token",
      });
    }

    const user = await User.findById(resetToken.userId);
    if (!user || !user.isActive) {
      return errorResponse({
        status: 400,
        code: "USER_NOT_FOUND",
        message: "User not found or deactivated",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and invalidate session
    user.password = hashedPassword;
    user.sessionVersion = (user.sessionVersion || 1) + 1;
    await user.save();

    // Mark token as used
    resetToken.isUsed = true;
    await resetToken.save();

    // Audit log
    await AuditLog.create({
      userId: user._id,
      companyId: user.companyId,
      userEmail: user.email,
      userRole: user.role,
      action: "password.reset",
      entityType: "User",
      entityId: user._id,
    });

    return successResponse(null, "Password reset successfully. You can now sign in with your new password.");
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