import { NextRequest } from "next/server";
import { withCorrelationId, errorResponse, successResponse } from "@/lib/api/response";
import { connectToDatabase } from "@/lib/db/connection";
import { User } from "@/models/User";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { passwordResetRequestSchema } from "@/lib/validation/schemas";
import { sendEmail, passwordResetEmail } from "@/lib/email";
import { crypto } from "crypto";

async function handler(req: NextRequest, correlationId: string) {
  try {
    const body = await req.json();
    const { email } = passwordResetRequestSchema.parse(body);

    await connectToDatabase();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) {
      // Return generic response to prevent email enumeration
      return successResponse(null, "If an account exists, a password reset link has been sent.");
    }

    // Invalidate any existing unused tokens for this user
    await PasswordResetToken.updateMany(
      { userId: user._id, isUsed: false },
      { $set: { isUsed: true } }
    );

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await PasswordResetToken.create({
      userId: user._id,
      token: resetToken,
      expiresAt: resetExpires,
      isUsed: false,
    });

    // Send password reset email
    try {
      const appUrl = process.env.APP_URL || "http://localhost:3000";
      const resetUrl = `${appUrl}/auth/reset-password?token=${resetToken}`;
      await sendEmail(passwordResetEmail(user.email, resetUrl));
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
    }

    return successResponse(null, "If an account exists, a password reset link has been sent.");
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