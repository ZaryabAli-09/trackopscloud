require("dotenv").config({
  path: require("path").join(__dirname, ".env"),
});

const bcrypt = require("bcryptjs");
const { connectToDatabase } = require("./db-connection");
const { User } = require("./user-model");
const { AuditLog } = require("./audit-log-model");

async function seed() {
  const email = process.env.PLATFORM_ADMIN_SEED_EMAIL;
  const password = process.env.PLATFORM_ADMIN_SEED_PASSWORD;
  if (!email || !password) {
    console.error("Missing env vars");
    process.exit(1);
  }
  await connectToDatabase();
  const existing = await User.findOne({ email: email.toLowerCase(), role: "platform_admin" });
  if (existing) {
    console.log("Platform administrator already exists");
    process.exit(0);
  }
  const hash = await bcrypt.hash(password, 12);
  const admin = await User.create({
    email: email.toLowerCase(),
    password: hash,
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
  console.log("✅ Platform administrator created: " + email);
  console.log("   Sign in with: " + email + " / " + password);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});