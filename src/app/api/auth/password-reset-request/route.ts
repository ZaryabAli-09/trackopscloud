import { appConfig } from "@/config/app.config";
import { defineRoute } from "@/lib/api/define-route";
import { AppError, successResponse } from "@/lib/api/response";
import { clientAddress, limitRate } from "@/lib/auth/rate-limit";
import { createToken } from "@/lib/auth/tokens";
import { passwordResetEmail, sendEmail } from "@/lib/email";
import { passwordResetRequestSchema } from "@/lib/validation/schemas";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { User } from "@/models/User";

export const POST = defineRoute(
  { scope: "public", bodySchema: passwordResetRequestSchema },
  async (request, { body, correlationId }) => {
    await limitRate("password-reset-request", clientAddress(request));
    const user = await User.findOne({ email: body.email.toLowerCase(), isActive: true });
    const genericMessage = "If an account exists, a password reset link has been sent.";
    if (!user) return successResponse(null, genericMessage);
    await PasswordResetToken.updateMany({ userId: user._id, isUsed: false }, { $set: { isUsed: true } });
    const token = createToken();
    await PasswordResetToken.create({ userId: user._id, token: token.hash, expiresAt: new Date(Date.now() + 60 * 60 * 1000), isUsed: false });
    try { await sendEmail(passwordResetEmail(user.email, `${appConfig.url}/reset-password?token=${token.raw}`)); }
    catch (error) {
      console.error(`[${correlationId}] Password reset email failed`, error);
      throw new AppError({ status: 502, code: "EMAIL_DELIVERY_FAILED", message: "Password reset email could not be sent" });
    }
    return successResponse(null, genericMessage);
  },
);
