import { Types } from "mongoose";
import type { NextRequest } from "next/server";
import { authenticate } from "@/lib/server/auth";
import { connectDB } from "@/lib/server/db";
import { ApiError } from "@/lib/server/errors";
import Wishlist from "@/lib/server/models/wishlist";

export async function getWishlist(request: NextRequest) {
  const user = await authenticate(request);
  await connectDB();
  let wishlist = await Wishlist.findOne({ user: user._id }).populate("products");
  if (!wishlist) wishlist = await Wishlist.create({ user: user._id, products: [] });
  return Response.json({ message: "Wishlist fetched successfully", success: true, wishlist });
}

export async function addToWishlist(request: NextRequest, productId: string) {
  const user = await authenticate(request);
  if (!Types.ObjectId.isValid(productId)) throw new ApiError("Invalid product ID", 400);
  await connectDB();
  let wishlist = await Wishlist.findOne({ user: user._id });
  if (!wishlist) wishlist = await Wishlist.create({ user: user._id, products: [productId] });
  else if (!(wishlist.products as unknown as Types.ObjectId[]).some((id) => id.toString() === productId)) {
    wishlist.products.push(new Types.ObjectId(productId));
    await wishlist.save();
  }
  return Response.json({ message: "Product added to wishlist", success: true, wishlist });
}

export async function removeFromWishlist(request: NextRequest, productId: string) {
  const user = await authenticate(request);
  if (!Types.ObjectId.isValid(productId)) throw new ApiError("Invalid product ID", 400);
  await connectDB();
  const wishlist = await Wishlist.findOne({ user: user._id });
  if (wishlist) {
    const products = wishlist.products as unknown as Types.ObjectId[];
    wishlist.products = products.filter((id) => id.toString() !== productId);
    await wishlist.save();
  }
  return Response.json({ message: "Product removed from wishlist", success: true, wishlist });
}
