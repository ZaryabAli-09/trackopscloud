import { v2 as cloudinary } from "cloudinary";
import { serverEnv } from "@/config/app.config";
import { AppError } from "@/lib/api/response";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

cloudinary.config({
  cloud_name: serverEnv.CLOUDINARY_CLOUD_NAME,
  api_key: serverEnv.CLOUDINARY_API_KEY,
  api_secret: serverEnv.CLOUDINARY_API_SECRET,
  secure: true,
});

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
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new AppError({
      status: 400,
      code: "INVALID_FILE_TYPE",
      message: `Unsupported file type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
    });
  }

  if (size > MAX_FILE_SIZE) {
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
  } catch (error) {
    throw new AppError({
      status: 500,
      code: "UPLOAD_FAILED",
      message: error instanceof Error ? error.message : "Image upload failed",
    });
  }
}

export async function deleteImage(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    // Don't throw - deletion failure shouldn't block the operation
  }
}

export function getCompanyFolder(companyId: string, type: "logos" | "items"): string {
  return `ledgerly/companies/${companyId}/${type}`;
}

export function getOptimizedUrl(
  publicId: string,
  options: { width?: number; height?: number; quality?: string; format?: string } = {}
): string {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width: options.width, height: options.height, crop: "fill" },
      { quality: options.quality ?? "auto" },
      { fetch_format: options.format ?? "auto" },
    ],
  });
}