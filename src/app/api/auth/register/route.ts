import bcrypt from "bcryptjs";
import { Types } from "mongoose";
import { defineRoute } from "@/lib/api/define-route";
import { AppError, createdResponse } from "@/lib/api/response";
import { clientAddress, limitRate } from "@/lib/auth/rate-limit";
import { deleteImage, getCompanyFolder, uploadImage, validateFile } from "@/lib/cloudinary";
import { connectToDatabase } from "@/lib/db/connection";
import { withDatabaseTransaction } from "@/lib/db/transaction";
import { applicationReceivedEmail, sendEmail } from "@/lib/email";
import { companyRegistrationSchema } from "@/lib/validation/schemas";
import { AuditLog } from "@/models/AuditLog";
import { Company } from "@/models/Company";
import { User } from "@/models/User";

export const POST = defineRoute(
  { scope: "public", bodySchema: companyRegistrationSchema },
  async (request, { body, formData, correlationId }) => {
    await limitRate("register", clientAddress(request));
    await connectToDatabase();
    const email = body.email.toLowerCase();
    if (await Company.exists({ email }) || await User.exists({ email })) {
      throw new AppError({ status: 409, code: "DUPLICATE_REGISTRATION", message: "An account with this email already exists" });
    }
    const companyId = new Types.ObjectId();
    let logo: { publicId: string; url: string } | null = null;
    const file = formData?.get("logo");
    if (file instanceof File && file.size > 0) {
      validateFile(file, file.type, file.size);
      const uploaded = await uploadImage(Buffer.from(await file.arrayBuffer()), { folder: getCompanyFolder(companyId.toString(), "logos"), fileName: "logo", mimeType: file.type });
      logo = { publicId: uploaded.publicId, url: uploaded.secureUrl };
    }
    const password = await bcrypt.hash(body.password, 12);
    try {
      await withDatabaseTransaction(async (session) => {
        await Company.create([{ _id: companyId, name: body.name, email, status: "pending", contactNumber: body.contactNumber ?? null, businessAddress: body.businessAddress ?? null, isEmailVerified: false, userCount: 1, productCount: 0, logo }], { session });
        const [user] = await User.create([{ email, password, firstName: body.name.split(" ")[0] || "Admin", lastName: body.name.split(" ").slice(1).join(" ") || "User", role: "company_admin", companyId, isActive: false, emailVerified: false, sessionVersion: 1 }], { session });
        await AuditLog.create([{ userId: user._id, companyId, userEmail: email, userRole: "company_admin", action: "company.register", entityType: "Company", entityId: companyId, metadata: { status: "pending" } }], { session });
      });
    } catch (error) {
      if (logo) {
        console.error(`[${correlationId}] Registration failed after logo upload; removing asset`);
        try { await deleteImage(logo.publicId); }
        catch (cleanupError) { console.error(`[${correlationId}] Logo cleanup failed`, cleanupError); }
      }
      throw error;
    }
    try { await sendEmail(applicationReceivedEmail(body.name, email)); }
    catch (error) {
      console.error(`[${correlationId}] Registration saved but confirmation email failed`, error);
      throw new AppError({ status: 502, code: "EMAIL_DELIVERY_FAILED", message: "Registration was saved, but the confirmation email could not be sent" });
    }
    return createdResponse({ companyId: companyId.toString() }, "Registration submitted successfully. Your application is pending review.");
  },
);
