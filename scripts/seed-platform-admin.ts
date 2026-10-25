import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db/connection";
import { User } from "@/models/User";
import { AuditLog } from "@/models/AuditLog";
import { serverEnv } from "@/config/app.config";

async function seedPlatformAdmin() {
  const email = serverEnv.PLATFORM_ADMIN_SEED_EMAIL;
  const password = serverEnv.PLATFORM_ADMIN_SEED_PASSWORD;

  if (!email || !password) {
    console.error("❌ PLATFORM_ADMIN_SEED_EMAIL and PLATFORM_ADMIN_SEED_PASSWORD must be set");
    process.exit(1);
  }

  await connectToDatabase();

  const existingAdmin = await User.findOne({ email: email.toLowerCase(), role: "platform_admin" });
  if (existingAdmin) {
    console.log(`⚠️ Platform administrator already exists: ${email}`);
    console.log("   Skipping seed to avoid overwriting existing credentials.");
    process.exit(0);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const admin = await User.create({
    email: email.toLowerCase(),
    password: hashedPassword,
    firstName: "Platform",
    lastName: "Administrator",
    role: "platform_admin",
    companyId: null,
    isActive: true,
    emailVerified: true,
    sessionVersion: 1,
  });

  await AuditLog.create({
    userId: admin._id,
    userEmail: admin.email,
    userRole: admin.role,
    action: "platform_admin.seed",
    entityType: "User",
    entityId: admin._id,
    metadata: { email: admin.email },
  });

  console.log(`✅ Platform administrator created: ${email}`);
  console.log("   You can now sign in to the platform admin dashboard.");
}

seedPlatformAdmin().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});