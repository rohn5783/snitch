import { NextResponse } from "next/server";
import { AppError, ErrorCode } from "./api-error";

export * from "./api-error";

export interface StandardErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  correlationId?: string;
  // Backward compatibility fields
  errors?: unknown;
}

export function errorResponse(error: unknown, correlationId?: string): NextResponse<StandardErrorResponse> {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        correlationId,
        errors: error.details,
      },
      { status: error.status },
    );
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (typeof error === "object" && error !== null && "code" in error && (error as { code: number }).code === 11000) {
    const key = Object.keys((error as { keyPattern?: Record<string, unknown> }).keyPattern || {})[0] || "field";
    const message = `A record with this ${key} already exists`;
    return NextResponse.json(
      {
        success: false,
        message,
        error: {
          code: ErrorCode.CONFLICT,
          message,
        },
        correlationId,
      },
      { status: 409 },
    );
  }

  // Handle Mongoose / Zod validation errors
  if (typeof error === "object" && error !== null && "name" in error && (error as { name: string }).name === "ValidationError") {
    const message = (error as { message?: string }).message || "Validation failed";
    return NextResponse.json(
      {
        success: false,
        message,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message,
          details: (error as { errors?: unknown }).errors,
        },
        correlationId,
        errors: (error as { errors?: unknown }).errors,
      },
      { status: 422 },
    );
  }

  console.error(`[Unhandled Server Error] [${correlationId || "no-correlation-id"}]`, error);

  return NextResponse.json(
    {
      success: false,
      message: "An internal server error occurred",
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: "Internal server error",
      },
      correlationId,
    },
    { status: 500 },
  );
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw AppError.badRequest("Invalid JSON request body");
  }
}

