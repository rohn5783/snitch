import { Types } from "mongoose";
import { connectDB } from "@/lib/server/database/connection";
import Product, { type IProduct } from "@/lib/server/models/product";
import type { PaginationMeta } from "@/lib/server/middleware/request-context";
import type { ProductQueryInput } from "@/lib/server/validators/product.validator";

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export class ProductRepository {
  async findById(id: string | Types.ObjectId, activeOnly = true): Promise<IProduct | null> {
    await connectDB();
    const filter: Record<string, unknown> = { _id: id };
    if (activeOnly) {
      filter.isActive = { $ne: false };
    }
    return Product.findOne(filter);
  }

  async findBySellerAndId(productId: string | Types.ObjectId, sellerId: string | Types.ObjectId): Promise<IProduct | null> {
    await connectDB();
    return Product.findOne({ _id: productId, seller: sellerId });
  }

  async findBySeller(sellerId: string | Types.ObjectId): Promise<IProduct[]> {
    await connectDB();
    return Product.find({ seller: sellerId }).sort({ createdAt: -1 });
  }

  async searchProducts(query: ProductQueryInput): Promise<PaginatedResult<IProduct>> {
    await connectDB();
    const filter: Record<string, unknown> = { isActive: { $ne: false } };

    // Search query: Text search if available, fallback to regex
    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escaped, "i");
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { sku: searchRegex },
        { tags: searchRegex },
      ];
    }

    // Category filter
    if (query.category) {
      filter.category = { $regex: new RegExp(`^${query.category.trim()}$`, "i") };
    }

    // Price range filter
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      const priceFilter: Record<string, number> = {};
      if (query.minPrice !== undefined) priceFilter.$gte = query.minPrice;
      if (query.maxPrice !== undefined) priceFilter.$lte = query.maxPrice;
      filter["price.amount"] = priceFilter;
    }

    // Size or Color attribute filter in variants
    if (query.size) {
      filter["variants.attributes.Size"] = { $regex: new RegExp(query.size, "i") };
    }
    if (query.color) {
      filter["variants.attributes.Color"] = { $regex: new RegExp(query.color, "i") };
    }

    // Availability filter
    if (query.availability === "in_stock") {
      filter["variants.stock"] = { $gt: 0 };
    } else if (query.availability === "out_of_stock") {
      filter["variants.stock"] = { $lte: 0 };
    }

    // Sorting
    const sort: Record<string, 1 | -1> = {};
    switch (query.sort) {
      case "price_asc":
        sort["price.amount"] = 1;
        break;
      case "price_desc":
        sort["price.amount"] = -1;
        break;
      case "popular":
        sort.totalSold = -1;
        break;
      case "rating":
        sort.averageRating = -1;
        break;
      case "newest":
      default:
        sort.createdAt = -1;
        break;
    }

    const page = Math.max(1, query.page);
    const limit = Math.max(1, Math.min(100, query.limit));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: data as unknown as IProduct[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async create(data: Partial<IProduct>): Promise<IProduct> {
    await connectDB();
    return Product.create(data);
  }

  async update(productId: string | Types.ObjectId, data: Partial<IProduct>): Promise<IProduct | null> {
    await connectDB();
    return Product.findByIdAndUpdate(productId, { $set: data }, { new: true });
  }

  async getDistinctCategories(): Promise<string[]> {
    await connectDB();
    const categories = await Product.distinct("category", { isActive: { $ne: false } });
    return categories.filter((c): c is string => Boolean(c));
  }
}

export const productRepository = new ProductRepository();
