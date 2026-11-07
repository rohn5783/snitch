export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  correlationId?: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const SENSITIVE_KEYS = new Set([
  "password",
  "token",
  "refreshtoken",
  "refresh_token",
  "secret",
  "jwt_secret",
  "razorpay_key_secret",
  "imagekit_private_key",
  "cookie",
  "authorization",
  "cvv",
  "cardnumber",
  "card_number",
  "signature",
  "razorpay_signature",
]);

export function sanitize(data: unknown, depth = 0): unknown {
  if (depth > 6) return "[MaxDepthReached]";
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitize(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitize(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export class Logger {
  constructor(private readonly correlationId?: string, private readonly defaultContext: Record<string, unknown> = {}) {}

  private write(level: LogLevel, message: string, context?: Record<string, unknown>, err?: unknown) {
    const payload: LogPayload = {
      level,
      message,
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId,
      context: context ? (sanitize({ ...this.defaultContext, ...context }) as Record<string, unknown>) : this.defaultContext,
    };

    if (err instanceof Error) {
      payload.error = {
        name: err.name,
        message: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      };
    }

    const output = JSON.stringify(payload);
    if (level === "error") {
      console.error(output);
    } else if (level === "warn") {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== "production") {
      this.write("debug", message, context);
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    this.write("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.write("warn", message, context);
  }

  error(message: string, err?: unknown, context?: Record<string, unknown>) {
    this.write("error", message, context, err);
  }

  child(correlationId?: string, additionalContext?: Record<string, unknown>): Logger {
    return new Logger(correlationId || this.correlationId, { ...this.defaultContext, ...additionalContext });
  }
}

export const logger = new Logger();

