import mongoose from "mongoose";
import { getServerEnv } from "@/config/env.server";

type ConnectionCache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalConnection = globalThis as typeof globalThis & { __trackopsMongo?: ConnectionCache };
const cache = globalConnection.__trackopsMongo ??= { conn: null, promise: null };

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) return cache.conn;
  if (!cache.promise) {
    const env = getServerEnv();
    cache.promise = mongoose.connect(env.MONGODB_URI, {
      ...(env.MONGODB_DB_NAME ? { dbName: env.MONGODB_DB_NAME } : {}),
      serverSelectionTimeoutMS: 10000,
    });
  }
  try {
    cache.conn = await cache.promise;
    return cache.conn;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}
