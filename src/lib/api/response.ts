import { NextResponse } from "next/server";
import { ZodError, type ZodIssue } from "zod";

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  meta: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  } | null;
  error: {
    code: string;
    details?: Array<{ path: string; message: string }>;
  } | null;
}

export interface ApiErrorOptions {
  status: number;
  code: string;
  message: string;
  details?: Array<{ path: string; message: string }>;
}

export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: Array<{ path: string; message: string }> | undefined;

  constructor({ status, code, message, details }: ApiErrorOptions) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = "AppError";
  }
}

export function successResponse<T = unknown>(
  data: T | null,
  message: string = "Success",
  meta: ApiResponse<T>["meta"] = null
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      meta,
      error: null,
    },
    { status: 200 }
  );
}

export function createdResponse<T = unknown>(
  data: T | null,
  message: string = "Created successfully",
  meta: ApiResponse<T>["meta"] = null
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      meta,
      error: null,
    },
    { status: 201 }
  );
}

export function errorResponse({
  status,
  code,
  message,
  details,
}: ApiErrorOptions): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      message,
      data: null,
      meta: null,
      error: {
        code,
        details: details ?? undefined,
      },
    },
    { status }
  );
}

export function handleError(error: unknown, correlationId: string): NextResponse<ApiResponse> {
  console.error(`[${correlationId}] Unhandled error:`, error);

  if (error instanceof AppError) {
    return errorResponse({
      status: error.status,
      code: error.code,
      message: error.message,
      details: error.details,
    });
  }

  if (error instanceof ZodError) {
    return errorResponse({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: error.issues.map((err: ZodIssue) => ({
        path: err.path.join("."),
        message: err.message,
      })),
    });
  }

  if (error instanceof Error) {
    // Handle common Mongoose errors
    if (error.name === "ValidationError") {
      const e = error as Error & { errors?: Record<string, { message: string }>; keyValue?: Record<string, unknown> };
      return errorResponse({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: Object.entries(e.errors || {}).map(([key, val]: [string, { message: string }]) => ({
          path: key,
          message: val.message || "Invalid value",
        })),
      });
    }

    if (error.name === "MongoServerError" && (error as Error & { code?: number }).code === 11000) {
      const e = error as Error & { keyValue?: Record<string, unknown> };
      const duplicateKey = Object.keys(e.keyValue || {}).join(", ");
      return errorResponse({
        status: 409,
        code: "DUPLICATE_ERROR",
        message: `Duplicate value for: ${duplicateKey}`,
      });
    }

    if (error.name === "CastError") {
      return errorResponse({
        status: 400,
        code: "INVALID_ID",
        message: "Invalid resource identifier",
      });
    }
  }

  // Never leak internal errors to the client
  return errorResponse({
    status: 500,
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred. Please contact support.",
  });
}

