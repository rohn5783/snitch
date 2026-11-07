import { z } from "zod";

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  size: z.string().trim().optional(),
  color: z.string().trim().optional(),
  availability: z.enum(["all", "in_stock", "out_of_stock"]).default("all"),
  sort: z.enum(["newest", "price_asc", "price_desc", "popular", "rating"]).default("newest"),
});

export const createProductSchema = z.object({
  title: z.string().trim().min(2, "Title must be between 2 and 120 characters").max(120),
  description: z.string().trim().min(5, "Description must be between 5 and 3000 characters").max(3000),
  category: z.string().trim().min(2).max(80).default("Other"),
  sku: z.string().trim().max(64).optional().default(""),
  priceAmount: z.coerce.number().positive("Price must be greater than zero"),
  priceCurrency: z.enum(["INR", "USD", "EUR", "GBP", "JPY"]).default("INR"),
  optionName: z.string().trim().min(1).max(40).default("Option"),
  optionValue: z.string().trim().min(1).max(80).default("Standard"),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative").default(0),
});

export const updateProductSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().min(5).max(3000).optional(),
  category: z.string().trim().min(2).max(80).optional(),
  sku: z.string().trim().max(64).optional(),
  priceAmount: z.coerce.number().positive().optional(),
  isActive: z.boolean().optional(),
});

export const addVariantSchema = z.object({
  stock: z.coerce.number().int().min(0).default(0),
  priceAmount: z.coerce.number().positive().optional(),
  priceCurrency: z.enum(["INR", "USD", "EUR", "GBP", "JPY"]).optional(),
  attributes: z.record(z.string(), z.string()).refine((attr) => Object.keys(attr).length > 0, {
    message: "At least one variant attribute is required",
  }),
});

export const updateVariantSchema = z.object({
  stock: z.coerce.number().int().min(0).optional(),
  priceAmount: z.coerce.number().positive().optional(),
});

export type ProductQueryInput = z.infer<typeof productQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type AddVariantInput = z.infer<typeof addVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;

