import bcrypt from "bcryptjs";
import { defineRoute } from "@/lib/api/define-route";
import { AppError, successResponse } from "@/lib/api/response";
import { hashToken } from "@/lib/auth/tokens";
import { connectToDatabase } from "@/lib/db/connection";
import { withDatabaseTransaction } from "@/lib/db/transaction";
import { passwordResetSchema } from "@/lib/validation/schemas";
import { AuditLog } from "@/models/AuditLog";
import { PasswordResetToken } from "@/models/PasswordResetToken";
import { User } from "@/models/User";

export const POST = defineRoute(
  { scope: "public", bodySchema: passwordResetSchema },
  async (_request, { body }) => {
    await connectToDatabase();
    await withDatabaseTransaction(async (session) => {
        const token = await PasswordResetToken.findOneAndUpdate({ token: hashToken(body.token), isUsed: false, expiresAt: { $gt: new Date() } }, { $set: { isUsed: true } }, { returnDocument: "after", session });
        if (!token) throw new AppError({ status: 400, code: "INVALID_OR_EXPIRED_TOKEN", message: "Invalid or expired reset token" });
        const user = await User.findOne({ _id: token.userId, isActive: true }).session(session ?? null);
        if (!user) throw new AppError({ status: 400, code: "INVALID_OR_EXPIRED_TOKEN", message: "Invalid or expired reset token" });
        user.password = await bcrypt.hash(body.password, 12);
        user.sessionVersion += 1;
        await user.save({ session });
        await AuditLog.create([{ userId: user._id, companyId: user.companyId, userEmail: user.email, userRole: user.role, action: "password.reset", entityType: "User", entityId: user._id }], { session });
    });
    return successResponse(null, "Password reset successfully. You can now sign in.");
  },
);
