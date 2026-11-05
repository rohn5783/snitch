import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorResponse(error: unknown) {
  if (
    error instanceof Error
    && "status" in error
    && typeof error.status === "number"
    && error.status >= 400
    && error.status <= 599
  ) {
    const apiError = error as ApiError;
    return NextResponse.json(
      { message: apiError.message, success: false, ...(apiError.details ? { errors: apiError.details } : {}) },
      { status: apiError.status },
    );
  }

  console.error("Next.js API request failed", error);
  return NextResponse.json({ message: "Server error", success: false }, { status: 500 });
}

export async function readJson(request: Request) {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    throw new ApiError("Invalid JSON request body", 400);
  }
}
