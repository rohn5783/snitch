import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().default("5173"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGO_URI: z.string().min(1, "MONGO_URI is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters long"),
  JWT_REFRESH_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_CALLBACK_URL: z.string().optional().default(""),
  IMAGEKIT_PRIVATE_KEY: z.string().optional().default(""),
  RAZORPAY_KEY_ID: z.string().optional().default(""),
  RAZORPAY_KEY_SECRET: z.string().optional().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(""),
  REDIS_URL: z.string().optional().default(""),
  SENTRY_DSN: z.string().optional().default(""),
});

export type ServerEnv = z.infer<typeof envSchema>;

let parsedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (parsedEnv) return parsedEnv;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    console.error(`Invalid server environment variables:\n${issues}`);
    // Return a fallback parsed object using process.env for resilience in tests/partial setups
    parsedEnv = {
      PORT: process.env.PORT || "5173",
      NODE_ENV: (process.env.NODE_ENV as "development" | "test" | "production") || "development",
      MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/snitch",
      JWT_SECRET: process.env.JWT_SECRET || "development-insecure-jwt-secret-snitch-test-32chars",
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || "development-insecure-jwt-refresh-secret-snitch",
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
      GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || "",
      IMAGEKIT_PRIVATE_KEY: process.env.IMAGEKIT_PRIVATE_KEY || "",
      RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
      RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
      RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || "",
      REDIS_URL: process.env.REDIS_URL || "",
      SENTRY_DSN: process.env.SENTRY_DSN || "",
    };
    return parsedEnv;
  }

  parsedEnv = {
    ...result.data,
    JWT_REFRESH_SECRET: result.data.JWT_REFRESH_SECRET || `${result.data.JWT_SECRET}_refresh`,
  };
  return parsedEnv;
}

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    const config = getServerEnv();
    const envVal = (config as unknown as Record<string, string>)[name];
    if (envVal) return envVal;
    throw new Error(`${name} is not configured in server environment`);
  }
  return value;
}

