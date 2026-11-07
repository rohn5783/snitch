export enum ErrorCode {
  BAD_REQUEST = "BAD_REQUEST",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  RATE_LIMITED = "RATE_LIMITED",
  PAYMENT_REQUIRED = "PAYMENT_REQUIRED",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
}

export class AppError extends Error {
  public readonly isOperational = true;

  constructor(
    public readonly message: string,
    public readonly status: number = 400,
    public readonly code: ErrorCode | string = ErrorCode.BAD_REQUEST,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(message = "Bad request", details?: unknown, code = ErrorCode.BAD_REQUEST) {
    return new AppError(message, 400, code, details);
  }

  static unauthorized(message = "Unauthorized", details?: unknown) {
    return new AppError(message, 401, ErrorCode.UNAUTHORIZED, details);
  }

  static forbidden(message = "Forbidden", details?: unknown) {
    return new AppError(message, 403, ErrorCode.FORBIDDEN, details);
  }

  static notFound(message = "Resource not found", details?: unknown) {
    return new AppError(message, 404, ErrorCode.NOT_FOUND, details);
  }

  static conflict(message = "Conflict", details?: unknown) {
    return new AppError(message, 409, ErrorCode.CONFLICT, details);
  }

  static validation(message = "Validation failed", details?: unknown) {
    return new AppError(message, 422, ErrorCode.VALIDATION_ERROR, details);
  }

  static rateLimited(message = "Too many requests. Please slow down.", details?: unknown) {
    return new AppError(message, 429, ErrorCode.RATE_LIMITED, details);
  }

  static internal(message = "Internal server error", details?: unknown) {
    return new AppError(message, 500, ErrorCode.INTERNAL_ERROR, details);
  }

  static serviceUnavailable(message = "Service temporarily unavailable", details?: unknown) {
    return new AppError(message, 503, ErrorCode.SERVICE_UNAVAILABLE, details);
  }
}

// Preserve backwards compatibility with legacy ApiError
export const ApiError = AppError;

