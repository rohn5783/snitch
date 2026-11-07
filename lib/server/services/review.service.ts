import { Types } from "mongoose";
import { connectDB } from "@/lib/server/database/connection";
import { AppError } from "@/lib/server/errors/api-error";
import Payment from "@/lib/server/models/payment";
import Product from "@/lib/server/models/product";
import Review, { type IReview } from "@/lib/server/models/review";
import { cache } from "@/lib/server/utils/cache";

export class ReviewService {
  async addReview(
    userId: string,
    productId: string,
    input: { rating: number; title: string; comment: string },
  ): Promise<IReview> {
    if (!Types.ObjectId.isValid(productId)) {
      throw AppError.badRequest("Invalid product ID");
    }

    if (input.rating < 1 || input.rating > 5) {
      throw AppError.badRequest("Rating must be between 1 and 5 stars");
    }

    await connectDB();
    const product = await Product.findById(productId);
    if (!product) {
      throw AppError.notFound("Product not found");
    }

    const existing = await Review.findOne({
      product: new Types.ObjectId(productId),
      user: new Types.ObjectId(userId),
    });
    if (existing) {
      throw AppError.conflict("You have already reviewed this product");
    }

    // Check verified purchase
    const verifiedOrder = await Payment.findOne({
      user: new Types.ObjectId(userId),
      status: { $in: ["paid", "CAPTURED"] },
      "orderItems.productId": new Types.ObjectId(productId),
    });

    const isVerifiedPurchase = Boolean(verifiedOrder);

    const review = await Review.create({
      product: new Types.ObjectId(productId),
      user: new Types.ObjectId(userId),
      rating: Math.round(input.rating),
      title: input.title.trim(),
      comment: input.comment.trim(),
      isVerifiedPurchase,
    });

    // Update product rating summary
    const stats = await Review.aggregate([
      { $match: { product: new Types.ObjectId(productId) } },
      {
        $group: {
          _id: "$product",
          avgRating: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]);

    if (stats.length > 0) {
      product.averageRating = Math.round(stats[0].avgRating * 10) / 10;
      product.reviewCount = stats[0].count;
      await product.save();
    }

    await cache.del(`snitch:prod:detail:${productId}`);
    await cache.delPattern("snitch:prod:list:*");

    return review;
  }

  async getProductReviews(
    productId: string,
    page = 1,
    limit = 10,
  ): Promise<{ reviews: unknown[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    if (!Types.ObjectId.isValid(productId)) {
      throw AppError.badRequest("Invalid product ID");
    }

    await connectDB();
    const skip = (page - 1) * limit;

    const [total, reviews] = await Promise.all([
      Review.countDocuments({ product: new Types.ObjectId(productId) }),
      Review.find({ product: new Types.ObjectId(productId) })
        .populate("user", "fullname")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

export const reviewService = new ReviewService();

