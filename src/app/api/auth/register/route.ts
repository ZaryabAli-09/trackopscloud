import { NextRequest } from "next/server";
import { withCorrelationId, errorResponse, successResponse, createdResponse } from "@/lib/api/response";
import { connectToDatabase } from "@/lib/db/connection";
import { Company } from "@/models/Company";
import { User } from "@/models/User";
import { AccountActivationToken } from "@/models/AccountActivationToken";
import { AuditLog } from "@/models/AuditLog";
import bcrypt from "bcryptjs";
import { companyRegistrationSchema } from "@/lib/validation/schemas";
import { sendEmail, applicationReceivedEmail } from "@/lib/email";
import * as crypto from "crypto";

async function handler(req: NextRequest, correlationId: string) {
  try {
    const body = await req.json();
    const validated = companyRegistrationSchema.parse(body);

    await connectToDatabase();

    // Check for duplicate company email
    const existingCompany = await Company.findOne({ email: validated.email.toLowerCase() });
    if (existingCompany) {
      return errorResponse({
        status: 409,
        code: "DUPLICATE_REGISTRATION",
        message: "A company with this email is already registered",
      });
    }

    // Check for duplicate user email
    const existingUser = await User.findOne({ email: validated.email.toLowerCase() });
    if (existingUser) {
      return errorResponse({
        status: 409,
        code: "DUPLICATE_REGISTRATION",
        message: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(validated.password, 12);

    // Create pending company
    const company = await Company.create({
      name: validated.name,
      email: validated.email.toLowerCase(),
      status: "pending",
      contactNumber: validated.contactNumber ?? null,
      businessAddress: validated.businessAddress ?? null,
      isEmailVerified: false,
      userCount: 0,
      productCount: 0,
    });

    // Create initial company admin user
    const user = await User.create({
      email: validated.email.toLowerCase(),
      password: hashedPassword,
      firstName: validated.name.split(" ")[0] || "Admin",
      lastName: validated.name.split(" ").slice(1).join(" ") || "User",
      role: "company_admin",
      companyId: company._id,
      isActive: false, // Not active until approved
      emailVerified: false,
      sessionVersion: 1,
    });

    // Update company user count
    company.userCount = 1;
    await company.save();

    // Create activation token
    const activationToken = crypto.randomBytes(32).toString("hex");
    const activationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await AccountActivationToken.create({
      userId: user._id,
      companyId: company._id,
      token: activationToken,
      expiresAt: activationExpires,
      isUsed: false,
    });

    // Audit log
    await AuditLog.create({
      userId: user._id,
      companyId: company._id,
      userEmail: user.email,
      userRole: user.role,
      action: "company.register",
      entityType: "Company",
      entityId: company._id,
      metadata: { companyName: company.name, status: company.status },
      ipAddress: (req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined) as string | undefined,
      userAgent: req.headers.get("user-agent") ?? undefined,
    });

    // Send application received email
    try {
      const appUrl = process.env.APP_URL || "http://localhost:3000";
      await sendEmail(applicationReceivedEmail(company.name, company.email));
    } catch (emailError) {
      console.error("Failed to send application received email:", emailError);
    }

    return createdResponse(null, "Registration submitted successfully. Your application is pending review.");
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