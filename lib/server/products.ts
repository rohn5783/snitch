import type { NextRequest } from "next/server";
import { AppError } from "@/lib/server/errors/api-error";
import { readJson } from "@/lib/server/errors/index";
import { requireAuth } from "@/lib/server/middleware/auth-guard";
import { getRequestContext, standardResponse } from "@/lib/server/middleware/request-context";
import { productService } from "@/lib/server/services/product.service";
import { uploadImages } from "@/lib/server/upload";
import {
  addVariantSchema,
  createProductSchema,
  productQuerySchema,
  updateProductSchema,
  updateVariantSchema,
} from "@/lib/server/validators/product.validator";

export async function getProducts(request: NextRequest) {
  const { correlationId } = getRequestContext(request);
  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());

  const parseResult = productQuerySchema.safeParse(searchParams);
  if (!parseResult.success) {
    throw AppError.validation("Invalid product query parameters", parseResult.error.flatten().fieldErrors);
  }

  const { data, pagination } = await productService.getProducts(parseResult.data);

  return standardResponse(
    { products: data },
    {
      message: "Products fetched successfully",
      correlationId,
      pagination,
      extra: { products: data },
    },
  );
}

export async function getProduct(productId: string) {
  const product = await productService.getProductById(productId);
  return standardResponse(
    { product },
    {
      message: "Product details fetched successfully",
      extra: { product },
    },
  );
}

export async function getSellerProduct(request: NextRequest, productId: string) {
  const seller = await requireAuth(request, "seller");
  const product = await productService.getSellerProduct(productId, seller._id.toString());
  return standardResponse(
    { product },
    {
      message: "Product details fetched successfully",
      extra: { product },
    },
  );
}

export async function getSellerProducts(request: NextRequest) {
  const seller = await requireAuth(request, "seller");
  const products = await productService.getSellerProducts(seller._id.toString());
  return standardResponse(
    { products },
    {
      message: "Products fetched successfully",
      extra: { products },
    },
  );
}

export async function createProduct(request: NextRequest) {
  const seller = await requireAuth(request, "seller");
  const form = await request.formData();

  const rawFields = {
    title: String(form.get("title") ?? "").trim(),
    description: String(form.get("description") ?? "").trim(),
    category: String(form.get("category") ?? "Other").trim(),
    sku: String(form.get("sku") ?? "").trim(),
    priceAmount: form.get("priceAmount"),
    priceCurrency: String(form.get("priceCurrency") ?? "INR").trim(),
    optionName: String(form.get("optionName") ?? "Option").trim(),
    optionValue: String(form.get("optionValue") ?? "Standard").trim(),
    stock: form.get("stock"),
  };

  const parseResult = createProductSchema.safeParse(rawFields);
  if (!parseResult.success) {
    throw AppError.validation("Invalid product details", parseResult.error.flatten().fieldErrors);
  }

  const images = await uploadImages(form);
  const product = await productService.createProduct(seller._id.toString(), parseResult.data, images);

  return standardResponse(
    { product },
    {
      status: 201,
      message: "Product created successfully",
      extra: { product },
    },
  );
}

export async function updateSellerProduct(request: NextRequest, productId: string) {
  const seller = await requireAuth(request, "seller");
  const body = await readJson(request);

  const parseResult = updateProductSchema.safeParse(body);
  if (!parseResult.success) {
    throw AppError.validation("Invalid update payload", parseResult.error.flatten().fieldErrors);
  }

  const product = await productService.updateSellerProduct(productId, seller._id.toString(), parseResult.data);
  return standardResponse(
    { product },
    {
      message: "Product updated successfully",
      extra: { product },
    },
  );
}

export async function addProductVariant(request: NextRequest, productId: string) {
  const seller = await requireAuth(request, "seller");
  const form = await request.formData();

  const attributesRaw = String(form.get("attributes") ?? "{}");
  let attributes: Record<string, string>;
  try {
    attributes = JSON.parse(attributesRaw) as Record<string, string>;
  } catch {
    throw AppError.badRequest("Invalid variant attributes format");
  }

  const rawFields = {
    stock: form.get("stock"),
    priceAmount: form.get("priceAmount") || undefined,
    priceCurrency: form.get("priceCurrency") || undefined,
    attributes,
  };

  const parseResult = addVariantSchema.safeParse(rawFields);
  if (!parseResult.success) {
    throw AppError.validation("Invalid variant details", parseResult.error.flatten().fieldErrors);
  }

  const images = form.getAll("images").some((entry) => entry instanceof File)
    ? await uploadImages(form)
    : [];

  const product = await productService.addVariant(productId, seller._id.toString(), {
    ...parseResult.data,
    images,
  });

  return standardResponse(
    { product },
    {
      message: "Product variant added successfully",
      extra: { product },
    },
  );
}

export async function updateProductVariant(request: NextRequest, productId: string, variantId: string) {
  const seller = await requireAuth(request, "seller");
  const body = await readJson(request);

  const parseResult = updateVariantSchema.safeParse(body);
  if (!parseResult.success) {
    throw AppError.validation("Invalid variant update data", parseResult.error.flatten().fieldErrors);
  }

  const product = await productService.updateVariant(productId, variantId, seller._id.toString(), parseResult.data);
  return standardResponse(
    { product },
    {
      message: "Product option updated successfully",
      extra: { product },
    },
  );
}
