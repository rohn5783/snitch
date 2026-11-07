import { z } from "zod";

export const registerSchema = z.object({
  fullname: z
    .string()
    .trim()
    .min(3, "Full name must be at least 3 characters long")
    .max(120, "Full name cannot exceed 120 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email format")
    .max(255, "Email is too long"),
  contact: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Contact must be a 10-digit number"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(128, "Password cannot exceed 128 characters"),
  isSeller: z.boolean().default(false),
  role: z.enum(["buyer", "seller", "admin"]).optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email format"),
  password: z
    .string()
    .min(1, "Password is required"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});

export const updateProfileSchema = z.object({
  fullname: z.string().trim().min(3).max(120).optional(),
  contact: z.string().trim().regex(/^\d{10}$/, "Contact must be a 10-digit number").optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

