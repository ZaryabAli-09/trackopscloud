import { createHash } from "node:crypto";
import { getServerEnv } from "@/config/env.server";
import { AppError } from "@/lib/api/response";
import { connectToDatabase } from "@/lib/db/connection";
import { RateLimit } from "@/models/RateLimit";

export async function limitRate(scope: string, identifier: string) {
  await connectToDatabase();
  const { RATE_LIMIT_WINDOW_MS: windowMs, RATE_LIMIT_MAX_REQUESTS: maxRequests } = getServerEnv();
  const bucket = Math.floor(Date.now() / windowMs);
  const digest = createHash("sha256").update(identifier.toLowerCase()).digest("hex");
  const key = `${scope}:${bucket}:${digest}`;
  const record = await RateLimit.findOneAndUpdate(
    { key },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((bucket + 1) * windowMs) } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  if (record.count > maxRequests) {
    throw new AppError({ status: 429, code: "RATE_LIMITED", message: "Too many requests. Please try again later." });
  }
}

export function clientAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}
