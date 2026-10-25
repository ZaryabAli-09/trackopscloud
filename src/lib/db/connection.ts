import mongoose from "mongoose";
import { serverEnv } from "@/config/app.config";

let isConnected = false;

export const db = {
  isConnected: () => isConnected,
};

export async function connectToDatabase(): Promise<void> {
  if (isConnected) {
    return;
  }

  if (!serverEnv.MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined");
  }

  try {
    await mongoose.connect(serverEnv.MONGODB_URI, {
      dbName: "trackopscloud",
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error instanceof Error ? error.message : error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log("📴 MongoDB disconnected");
  }
}

// Mongoose connection event handlers
mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.log("⚠️ MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err.message);
  isConnected = false;
});

process.on("SIGINT", async () => {
  await disconnectDatabase();
  process.exit(0);
});