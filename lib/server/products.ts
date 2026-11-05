import { Types } from "mongoose";
import { ApiError } from "@/lib/server/errors";
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
  const filter: Record<string, unknown> = {};

  if (search) {
    const regex = new RegExp(escapedRegex(search), "i");
    filter.$or = [{ title: regex }, { description: regex }];
  }
  if (category) filter.title = { $regex: escapedRegex(category), $options: "i" };
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
  const product = await Product.findById(productId);
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

  if (title.length < 2 || title.length > 120) throw new ApiError("Title must be between 2 and 120 characters", 400);
  if (!description || description.length > 3000) throw new ApiError("A description of up to 3000 characters is required", 400);
  if (!["INR", "USD", "EUR", "GBP", "JPY"].includes(currency)) throw new ApiError("Unsupported price currency", 400);

  const images = await uploadImages(form);
  await connectDB();
  const product = await Product.create({
    title,
    description,
    price: { amount: parsePrice(form.get("priceAmount")), currency },
    images,
    seller: seller._id,
  });
  return Response.json({ message: "Product created successfully", success: true, product }, { status: 201 });
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
  product.variants.push({ images, price: { amount, currency }, stock, attributes });
  await product.save();
  return Response.json({ message: "Product variant added successfully", success: true, product });
}
