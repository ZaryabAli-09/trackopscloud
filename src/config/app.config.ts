import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z
    .string()
    .url("MONGODB_URI must be a valid MongoDB connection string"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  APP_URL: z.string().url("APP_URL must be a valid URL"),
  PLATFORM_CONTACT_EMAIL: z
    .string()
    .email("PLATFORM_CONTACT_EMAIL must be a valid email"),
  PLATFORM_SUPPORT_EMAIL: z
    .string()
    .email("PLATFORM_SUPPORT_EMAIL must be a valid email")
    .optional(),
  PLATFORM_ADMIN_SEED_EMAIL: z.string().email().optional(),
  PLATFORM_ADMIN_SEED_PASSWORD: z.string().min(8).optional(),
  GMAIL_SMTP_APP_PASSWORD: z.string().optional(),
  GMAIL_SMTP_EMAIL: z.string().email().optional(),
  SMTP_FROM: z.string().email().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.string().default("900000"),
  RATE_LIMIT_MAX_REQUESTS: z.string().default("100"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error(
    "❌ Invalid environment variables:",
    parsedEnv.error.flatten().fieldErrors,
  );
  process.exit(1);
}

const env = parsedEnv.data;

export const appConfig = {
  name: "TrackOpsCloud",
  contactEmail: env.PLATFORM_CONTACT_EMAIL,
  supportEmail: env.PLATFORM_SUPPORT_EMAIL ?? env.PLATFORM_CONTACT_EMAIL,
  url: env.APP_URL,
  nodeEnv: env.NODE_ENV,
  rateLimit: {
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
    maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
  },
} as const;

export type AppConfig = typeof appConfig;

export const serverEnv = {
  MONGODB_URI: env.MONGODB_URI,
  AUTH_SECRET: env.AUTH_SECRET,
  PLATFORM_ADMIN_SEED_EMAIL: env.PLATFORM_ADMIN_SEED_EMAIL,
  PLATFORM_ADMIN_SEED_PASSWORD: env.PLATFORM_ADMIN_SEED_PASSWORD,
  GMAIL_SMTP_APP_PASSWORD: env.GMAIL_SMTP_APP_PASSWORD,
  GMAIL_SMTP_EMAIL: env.GMAIL_SMTP_EMAIL,
  SMTP_FROM: env.SMTP_FROM,
  CLOUDINARY_CLOUD_NAME: env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: env.CLOUDINARY_API_SECRET,
} as const;

export type ServerEnv = typeof serverEnv;
