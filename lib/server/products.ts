import { Types } from "mongoose";
import { ApiError, readJson } from "@/lib/server/errors";
import { connectDB } from "@/lib/server/db";
import { authenticate } from "@/lib/server/auth";
import Product from "@/lib/server/models/product";
import { uploadImages } from "@/lib/server/upload";
import type { NextRequest } from "next/server";

function escapedRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePrice(value: FormDataEntryValue | null) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new ApiError("Price must be greater than zero", 400);
  return amount;
}

export async function getProducts(request: NextRequest) {
  await connectDB();
  const search = request.nextUrl.searchParams.get("search");
  const category = request.nextUrl.searchParams.get("category");
  const minPrice = request.nextUrl.searchParams.get("minPrice");
  const maxPrice = request.nextUrl.searchParams.get("maxPrice");
  const filter: Record<string, unknown> = { isActive: { $ne: false } };

  if (search) {
    const regex = new RegExp(escapedRegex(search), "i");
    filter.$or = [{ title: regex }, { description: regex }];
  }
  if (category) filter.category = { $regex: escapedRegex(category), $options: "i" };
  if (minPrice || maxPrice) {
    const range: Record<string, number> = {};
    if (minPrice) {
      const minimum = Number(minPrice);
      if (!Number.isFinite(minimum)) throw new ApiError("Invalid minimum price", 400);
      range.$gte = minimum;
    }
    if (maxPrice) {
      const maximum = Number(maxPrice);
      if (!Number.isFinite(maximum)) throw new ApiError("Invalid maximum price", 400);
      range.$lte = maximum;
    }
    filter["price.amount"] = range;
  }

  const products = await Product.find(filter);
  return Response.json({ message: "Products fetched successfully", success: true, products });
}

export async function getProduct(productId: string) {
  if (!Types.ObjectId.isValid(productId)) throw new ApiError("Invalid product ID", 400);
  await connectDB();
  const product = await Product.findOne({ _id: productId, isActive: { $ne: false } });
  if (!product) throw new ApiError("Product not found", 404);
  return Response.json({ message: "Product details fetched successfully", success: true, product });
}

export async function getSellerProduct(request: NextRequest, productId: string) {
  const seller = await authenticate(request, true);
  if (!Types.ObjectId.isValid(productId)) throw new ApiError("Invalid product ID", 400);
  await connectDB();
  const product = await Product.findOne({ _id: productId, seller: seller._id });
  if (!product) throw new ApiError("Product not found", 404);
  return Response.json({ message: "Product details fetched successfully", success: true, product });
}

export async function getSellerProducts(request: NextRequest) {
  const seller = await authenticate(request, true);
  const products = await Product.find({ seller: seller._id });
  return Response.json({ message: "Products fetched successfully", success: true, products });
}

export async function createProduct(request: NextRequest) {
  const seller = await authenticate(request, true);
  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const currency = String(form.get("priceCurrency") ?? "").trim();
  const category = String(form.get("category") ?? "Other").trim();
  const sku = String(form.get("sku") ?? "").trim();
  const optionName = String(form.get("optionName") ?? "Option").trim();
  const optionValue = String(form.get("optionValue") ?? "Standard").trim();
  const stock = Number(form.get("stock"));

  if (title.length < 2 || title.length > 120) throw new ApiError("Title must be between 2 and 120 characters", 400);
  if (!description || description.length > 3000) throw new ApiError("A description of up to 3000 characters is required", 400);
  if (category.length < 2 || category.length > 80) throw new ApiError("Category must be between 2 and 80 characters", 400);
  if (sku.length > 64) throw new ApiError("SKU must be 64 characters or fewer", 400);
  if (!optionName || optionName.length > 40 || !optionValue || optionValue.length > 80) {
    throw new ApiError("Enter a valid product option", 400);
  }
  if (!Number.isInteger(stock) || stock < 0) throw new ApiError("Stock must be a non-negative whole number", 400);
  if (!["INR", "USD", "EUR", "GBP", "JPY"].includes(currency)) throw new ApiError("Unsupported price currency", 400);
  const amount = parsePrice(form.get("priceAmount"));

  const images = await uploadImages(form);
  await connectDB();
  const product = await Product.create({
    title,
    description,
    category,
    sku,
    price: { amount, currency },
    images,
    variants: [{
      stock,
      attributes: { [optionName]: optionValue },
    }],
    seller: seller._id,
  });
  return Response.json({ message: "Product created successfully", success: true, product }, { status: 201 });
}

export async function updateSellerProduct(request: NextRequest, productId: string) {
  const seller = await authenticate(request, true);
  if (!Types.ObjectId.isValid(productId)) throw new ApiError("Invalid product ID", 400);
  const body = await readJson(request);
  await connectDB();
  const product = await Product.findOne({ _id: productId, seller: seller._id });
  if (!product) throw new ApiError("Product not found", 404);

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length < 2 || body.title.trim().length > 120) {
      throw new ApiError("Title must be between 2 and 120 characters", 400);
    }
    product.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string" || !body.description.trim() || body.description.length > 3000) {
      throw new ApiError("A description of up to 3000 characters is required", 400);
    }
    product.description = body.description.trim();
  }
  if (body.category !== undefined) {
    if (typeof body.category !== "string" || body.category.trim().length < 2 || body.category.trim().length > 80) {
      throw new ApiError("Category must be between 2 and 80 characters", 400);
    }
    product.category = body.category.trim();
  }
  if (body.sku !== undefined) {
    if (typeof body.sku !== "string" || body.sku.trim().length > 64) throw new ApiError("SKU must be 64 characters or fewer", 400);
    product.sku = body.sku.trim();
  }
  if (body.priceAmount !== undefined) {
    const amount = Number(body.priceAmount);
    if (!Number.isFinite(amount) || amount <= 0) throw new ApiError("Price must be greater than zero", 400);
    product.price.amount = amount;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") throw new ApiError("Availability must be enabled or disabled", 400);
    product.isActive = body.isActive;
  }
  await product.save();
  return Response.json({ message: "Product updated successfully", success: true, product });
}

export async function addProductVariant(request: NextRequest, productId: string) {
  const seller = await authenticate(request, true);
  if (!Types.ObjectId.isValid(productId)) throw new ApiError("Invalid product ID", 400);
  const form = await request.formData();
  const attributesValue = String(form.get("attributes") ?? "{}");
  let attributes: Record<string, string>;
  try {
    attributes = JSON.parse(attributesValue) as Record<string, string>;
  } catch {
    throw new ApiError("Invalid variant attributes", 400);
  }
  if (!Object.keys(attributes).length || Object.values(attributes).some((value) => typeof value !== "string" || !value.trim())) {
    throw new ApiError("Add at least one valid size, colour, or option", 400);
  }

  const stock = Number(form.get("stock"));
  if (!Number.isInteger(stock) || stock < 0) throw new ApiError("Stock must be a non-negative whole number", 400);
  const images = form.getAll("images").some((entry) => entry instanceof File)
    ? await uploadImages(form)
    : [];
  await connectDB();
  const product = await Product.findOne({ _id: productId, seller: seller._id });
  if (!product) throw new ApiError("Product not found", 404);

  const priceValue = String(form.get("priceAmount") ?? "").trim();
  const amount = priceValue ? parsePrice(priceValue) : product.price.amount;
  const currency = String(form.get("priceCurrency") ?? product.price.currency);
  if (!["INR", "USD", "EUR", "GBP", "JPY"].includes(currency)) throw new ApiError("Unsupported price currency", 400);
  product.variants.push({ images, ...(priceValue ? { price: { amount, currency } } : {}), stock, attributes });
  await product.save();
  return Response.json({ message: "Product variant added successfully", success: true, product });
}

export async function updateProductVariant(request: NextRequest, productId: string, variantId: string) {
  const seller = await authenticate(request, true);
  if (!Types.ObjectId.isValid(productId) || !Types.ObjectId.isValid(variantId)) {
    throw new ApiError("Invalid product or variant ID", 400);
  }
  const body = await readJson(request);
  await connectDB();
  const product = await Product.findOne({ _id: productId, seller: seller._id });
  const variant = product?.variants.find((option: { _id: Types.ObjectId }) => option._id.toString() === variantId);
  if (!product || !variant) throw new ApiError("Product option not found", 404);

  if (body.stock !== undefined) {
    const stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0) throw new ApiError("Stock must be a non-negative whole number", 400);
    variant.stock = stock;
  }
  if (body.priceAmount !== undefined) {
    const amount = Number(body.priceAmount);
    if (!Number.isFinite(amount) || amount <= 0) throw new ApiError("Price must be greater than zero", 400);
    variant.price = { amount, currency: product.price.currency };
  }
  await product.save();
  return Response.json({ message: "Product option updated successfully", success: true, product });
}
