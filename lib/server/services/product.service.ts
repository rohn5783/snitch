import { Types } from "mongoose";
import { AppError } from "@/lib/server/errors/api-error";
import { logger } from "@/lib/server/logger/logger";
import type { IProduct } from "@/lib/server/models/product";
import { productRepository, type PaginatedResult, type ProductRepository } from "@/lib/server/repositories/product.repository";
import { cache } from "@/lib/server/utils/cache";
import type { CreateProductInput, ProductQueryInput, UpdateProductInput } from "@/lib/server/validators/product.validator";

export class ProductService {
  constructor(private readonly productRepo: ProductRepository = productRepository) {}

  private getCacheKey(query: ProductQueryInput): string {
    const sortedQuery = Object.keys(query)
      .sort()
      .map((k) => `${k}:${(query as Record<string, unknown>)[k]}`)
      .join("|");
    return `snitch:prod:list:${Buffer.from(sortedQuery).toString("base64")}`;
  }

  async getProducts(query: ProductQueryInput): Promise<PaginatedResult<IProduct>> {
    const cacheKey = this.getCacheKey(query);
    return cache.wrap(
      cacheKey,
      async () => {
        return this.productRepo.searchProducts(query);
      },
      300, // 5 min TTL
    );
  }

  async getProductById(id: string): Promise<IProduct> {
    if (!Types.ObjectId.isValid(id)) {
      throw AppError.badRequest("Invalid product ID");
    }

    const cacheKey = `snitch:prod:detail:${id}`;
    const product = await cache.wrap(
      cacheKey,
      async () => {
        return this.productRepo.findById(id, true);
      },
      600, // 10 min TTL
    );

    if (!product) {
      throw AppError.notFound("Product not found");
    }

    return product;
  }

  async getSellerProduct(productId: string, sellerId: string): Promise<IProduct> {
    if (!Types.ObjectId.isValid(productId)) {
      throw AppError.badRequest("Invalid product ID");
    }

    const product = await this.productRepo.findBySellerAndId(productId, sellerId);
    if (!product) {
      throw AppError.notFound("Product not found");
    }
    return product;
  }

  async getSellerProducts(sellerId: string): Promise<IProduct[]> {
    return this.productRepo.findBySeller(sellerId);
  }

  async createProduct(
    sellerId: string,
    input: CreateProductInput,
    images: Array<{ url: string }>,
  ): Promise<IProduct> {
    const product = await this.productRepo.create({
      title: input.title,
      description: input.description,
      category: input.category,
      sku: input.sku,
      price: { amount: input.priceAmount, currency: input.priceCurrency },
      images,
      variants: [
        {
          sku: input.sku,
          stock: input.stock,
          reservedStock: 0,
          soldStock: 0,
          images: [],
          attributes: new Map([[input.optionName, input.optionValue]]),
          status: input.stock > 0 ? "in_stock" : "out_of_stock",
        },
      ] as unknown as IProduct["variants"],
      seller: new Types.ObjectId(sellerId),
      isActive: true,
    });

    // Invalidate product caches
    await cache.delPattern("snitch:prod:list:*");
    await cache.del("snitch:cat:list");
    logger.info("Product created and caches invalidated", { productId: product._id.toString() });

    return product;
  }

  async updateSellerProduct(
    productId: string,
    sellerId: string,
    input: UpdateProductInput,
  ): Promise<IProduct> {
    const product = await this.getSellerProduct(productId, sellerId);

    if (input.title !== undefined) product.title = input.title;
    if (input.description !== undefined) product.description = input.description;
    if (input.category !== undefined) product.category = input.category;
    if (input.sku !== undefined) product.sku = input.sku;
    if (input.priceAmount !== undefined) product.price.amount = input.priceAmount;
    if (input.isActive !== undefined) product.isActive = input.isActive;

    await product.save();

    await cache.del(`snitch:prod:detail:${productId}`);
    await cache.delPattern("snitch:prod:list:*");
    return product;
  }

  async addVariant(
    productId: string,
    sellerId: string,
    data: {
      stock: number;
      priceAmount?: number;
      priceCurrency?: string;
      attributes: Record<string, string>;
      images: Array<{ url: string }>;
    },
  ): Promise<IProduct> {
    const product = await this.getSellerProduct(productId, sellerId);

    const price = data.priceAmount
      ? { amount: data.priceAmount, currency: data.priceCurrency || product.price.currency }
      : undefined;

    product.variants.push({
      images: data.images,
      stock: data.stock,
      reservedStock: 0,
      soldStock: 0,
      attributes: new Map(Object.entries(data.attributes)),
      price,
      status: data.stock > 0 ? "in_stock" : "out_of_stock",
    } as unknown as IProduct["variants"][0]);

    await product.save();
    await cache.del(`snitch:prod:detail:${productId}`);
    await cache.delPattern("snitch:prod:list:*");
    return product;
  }

  async updateVariant(
    productId: string,
    variantId: string,
    sellerId: string,
    data: { stock?: number; priceAmount?: number },
  ): Promise<IProduct> {
    const product = await this.getSellerProduct(productId, sellerId);
    const variant = product.variants.find((v: { _id: { toString(): string } }) => v._id.toString() === variantId);

    if (!variant) {
      throw AppError.notFound("Product variant not found");
    }

    if (data.stock !== undefined) {
      variant.stock = data.stock;
      variant.status = data.stock > 0 ? (data.stock <= 5 ? "low_stock" : "in_stock") : "out_of_stock";
    }
    if (data.priceAmount !== undefined) {
      variant.price = { amount: data.priceAmount, currency: product.price.currency };
    }

    await product.save();
    await cache.del(`snitch:prod:detail:${productId}`);
    await cache.delPattern("snitch:prod:list:*");
    return product;
  }

  async getCategories(): Promise<string[]> {
    return cache.wrap(
      "snitch:cat:list",
      () => this.productRepo.getDistinctCategories(),
      1800, // 30 mins
    );
  }
}

export const productService = new ProductService();
