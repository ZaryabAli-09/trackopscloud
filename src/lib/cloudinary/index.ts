import { v2 as cloudinary } from "cloudinary";
import { serverEnv } from "@/config/env.server";
import { AppError } from "@/lib/api/response";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function configureCloudinary() {
  cloudinary.config({
    cloud_name: serverEnv.CLOUDINARY_CLOUD_NAME,
    api_key: serverEnv.CLOUDINARY_API_KEY,
    api_secret: serverEnv.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export interface UploadResult {
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  size: number;
  folder: string;
}

export function validateFile(file: File | Buffer, mimeType: string, size: number): void {
  void file;
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new AppError({
      status: 400,
      code: "INVALID_FILE_TYPE",
      message: `Unsupported file type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
    });
  }

  if (size <= 0 || size > MAX_FILE_SIZE) {
    throw new AppError({
      status: 400,
      code: "FILE_TOO_LARGE",
      message: `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`,
    });
  }
}

export async function uploadImage(
  fileBuffer: Buffer,
  options: {
    folder: string;
    fileName: string;
    mimeType: string;
  }
): Promise<UploadResult> {
  configureCloudinary();
  if (!serverEnv.CLOUDINARY_CLOUD_NAME || !serverEnv.CLOUDINARY_API_KEY || !serverEnv.CLOUDINARY_API_SECRET) {
    throw new AppError({
      status: 500,
      code: "CLOUDINARY_NOT_CONFIGURED",
      message: "Cloudinary is not configured",
    });
  }

  try {
    const result = await cloudinary.uploader.upload(
      `data:${options.mimeType};base64,${fileBuffer.toString("base64")}`,
      {
        folder: options.folder,
        public_id: options.fileName,
        overwrite: true,
        resource_type: "image",
        transformation: [
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      }
    );

    return {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
      folder: options.folder,
    };
  } catch {
    throw new AppError({
      status: 500,
      code: "UPLOAD_FAILED",
      message: "Image upload failed",
    });
  }
}

export async function deleteImage(publicId: string): Promise<void> {
  configureCloudinary();
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    if (result.result !== "ok" && result.result !== "not found") throw new Error("Unexpected Cloudinary delete result");
  } catch {
    throw new AppError({ status: 502, code: "ASSET_DELETE_FAILED", message: "Replaced image could not be removed" });
  }
}

export function getCompanyFolder(companyId: string, type: "logos" | "items"): string {
  return `trackopscloud/companies/${companyId}/${type}`;
}

export function getOptimizedUrl(
  publicId: string,
  options: { width?: number; height?: number; quality?: string; format?: string } = {}
): string {
  configureCloudinary();
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width: options.width, height: options.height, crop: "fill" },
      { quality: options.quality ?? "auto" },
      { fetch_format: options.format ?? "auto" },
    ],
  });
}
