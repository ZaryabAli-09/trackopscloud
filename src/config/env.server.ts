import "server-only";
import { z } from "zod";

const schema = z.object({
  MONGODB_URI: z.string().startsWith("mongodb"),
  MONGODB_DB_NAME: z.string().optional(),
  AUTH_SECRET: z.string().min(32),
  PLATFORM_ADMIN_SEED_EMAIL: z.email().optional(),
  PLATFORM_ADMIN_SEED_PASSWORD: z.string().min(8).optional(),
  GMAIL_SMTP_EMAIL: z.email().optional(),
  GMAIL_SMTP_APP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.email().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
});

let cached: z.infer<typeof schema> | undefined;

export function getServerEnv() {
  if (cached) return cached;
  const result = schema.safeParse({
    ...process.env,
    AUTH_SECRET: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  });
  if (!result.success) {
    const problems = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid server environment: ${problems}`);
  }
  cached = result.data;
  return cached;
}

/** Compatibility accessors remain lazy so importing a server module does not validate at build time. */
export const serverEnv = new Proxy({} as ReturnType<typeof getServerEnv>, {
  get(_target, property: keyof ReturnType<typeof getServerEnv>) {
    return getServerEnv()[property];
  },
});
