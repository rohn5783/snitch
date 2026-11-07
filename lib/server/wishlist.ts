import { Types } from "mongoose";
import type { NextRequest } from "next/server";
import { connectDB } from "@/lib/server/database/connection";
import { AppError } from "@/lib/server/errors/api-error";
import { requireAuth } from "@/lib/server/middleware/auth-guard";
import { standardResponse } from "@/lib/server/middleware/request-context";
import Wishlist from "@/lib/server/models/wishlist";

export async function getWishlist(request: NextRequest) {
  const user = await requireAuth(request);
  await connectDB();

  let wishlist = await Wishlist.findOne({ user: user._id }).populate("products");
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: user._id, products: [] });
  }

  return standardResponse(
    { wishlist },
    {
      message: "Wishlist fetched successfully",
      extra: { wishlist },
    },
  );
}

export async function addToWishlist(request: NextRequest, productId: string) {
  const user = await requireAuth(request);
  if (!Types.ObjectId.isValid(productId)) {
    throw AppError.badRequest("Invalid product ID");
  }

  await connectDB();
  let wishlist = await Wishlist.findOne({ user: user._id });
  if (!wishlist) {
    wishlist = await Wishlist.create({ user: user._id, products: [productId] });
  } else {
    const products = wishlist.products as unknown as Types.ObjectId[];
    if (!products.some((id) => id.toString() === productId)) {
      wishlist.products.push(new Types.ObjectId(productId) as unknown as (typeof wishlist.products)[0]);
      await wishlist.save();
    }
  }

  return standardResponse(
    { wishlist },
    {
      message: "Product added to wishlist",
      extra: { wishlist },
    },
  );
}

export async function removeFromWishlist(request: NextRequest, productId: string) {
  const user = await requireAuth(request);
  if (!Types.ObjectId.isValid(productId)) {
    throw AppError.badRequest("Invalid product ID");
  }

  await connectDB();
  const wishlist = await Wishlist.findOne({ user: user._id });
  if (wishlist) {
    const products = wishlist.products as unknown as Types.ObjectId[];
    wishlist.products = products.filter(
      (id) => id.toString() !== productId,
    ) as unknown as typeof wishlist.products;
    await wishlist.save();
  }

  return standardResponse(
    { wishlist },
    {
      message: "Product removed from wishlist",
      extra: { wishlist },
    },
  );
}
