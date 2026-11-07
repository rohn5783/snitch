import { Types } from "mongoose";
import { connectDB } from "@/lib/server/database/connection";
import Payment from "@/lib/server/models/payment";
import Product from "@/lib/server/models/product";
import User from "@/lib/server/models/user";

export interface SellerAnalytics {
  totalSales: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  bestSellers: Array<{ title: string; totalSold: number; revenue: number }>;
  lowStockProducts: Array<{ title: string; variantId: string; stock: number; sku?: string }>;
  monthlySales: Array<{ month: string; sales: number }>;
}

export interface AdminAnalytics {
  totalUsers: number;
  totalBuyers: number;
  totalSellers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  paymentStats: {
    paid: number;
    pending: number;
    failed: number;
    refunded: number;
  };
  refundStats: {
    count: number;
    totalAmount: number;
  };
  topCategories: Array<{ category: string; count: number; revenue: number }>;
  monthlyGrowth: Array<{ month: string; newUsers: number; revenue: number }>;
}

export class AnalyticsService {
  async getSellerAnalytics(sellerId: string): Promise<SellerAnalytics> {
    await connectDB();
    const sellerObjId = new Types.ObjectId(sellerId);

    // Get seller products
    const products = await Product.find({ seller: sellerObjId }).select("_id title variants");
    const productIds = products.map((p) => p._id);

    // Identify low stock products
    const lowStockProducts: SellerAnalytics["lowStockProducts"] = [];
    for (const prod of products) {
      const variants = prod.variants as unknown as Array<{ _id: { toString(): string }; stock: number; sku?: string }>;
      for (const variant of variants) {
        if (variant.stock <= 5) {
          lowStockProducts.push({
            title: prod.title,
            variantId: variant._id.toString(),
            stock: variant.stock,
            sku: variant.sku,
          });
        }
      }
    }

    if (!productIds.length) {
      return {
        totalSales: 0,
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        bestSellers: [],
        lowStockProducts,
        monthlySales: [],
      };
    }

    // Aggregate paid orders containing seller's items
    const ordersAggregation = await Payment.aggregate([
      {
        $match: {
          status: { $in: ["paid", "CAPTURED"] },
          "orderItems.productId": { $in: productIds },
        },
      },
      { $unwind: "$orderItems" },
      {
        $match: {
          $or: [
            { "orderItems.sellerId": sellerObjId },
            { "orderItems.productId": { $in: productIds } },
          ],
        },
      },
      {
        $group: {
          _id: "$orderItems.productId",
          title: { $first: "$orderItems.title" },
          totalSold: { $sum: "$orderItems.quantity" },
          revenue: { $sum: { $multiply: ["$orderItems.price.amount", "$orderItems.quantity"] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]);

    const bestSellers = ordersAggregation.map((item) => ({
      title: item.title,
      totalSold: item.totalSold,
      revenue: Math.round(item.revenue),
    }));

    // Calculate total sales & order counts
    const orders = await Payment.find({
      status: { $in: ["paid", "CAPTURED"] },
      "orderItems.productId": { $in: productIds },
    });

    let totalSales = 0;
    let pendingOrders = 0;
    let completedOrders = 0;

    for (const order of orders) {
      const sellerItems = order.orderItems.filter(
        (i) => i.sellerId?.toString() === sellerId || productIds.some((p) => p.toString() === i.productId.toString()),
      );
      for (const item of sellerItems) {
        totalSales += (item.price?.amount || 0) * item.quantity;
        if (item.fulfillmentStatus === "delivered" || item.fulfillmentStatus === "complete") {
          completedOrders++;
        } else {
          pendingOrders++;
        }
      }
    }

    // Monthly sales aggregation for the past 6 months
    const monthlySalesAgg = await Payment.aggregate([
      {
        $match: {
          status: { $in: ["paid", "CAPTURED"] },
          "orderItems.productId": { $in: productIds },
          createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
        },
      },
      { $unwind: "$orderItems" },
      {
        $match: {
          $or: [
            { "orderItems.sellerId": sellerObjId },
            { "orderItems.productId": { $in: productIds } },
          ],
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          sales: { $sum: { $multiply: ["$orderItems.price.amount", "$orderItems.quantity"] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthlySales = monthlySalesAgg.map((item) => ({
      month: item._id,
      sales: Math.round(item.sales),
    }));

    return {
      totalSales: Math.round(totalSales),
      totalOrders: orders.length,
      pendingOrders,
      completedOrders,
      bestSellers,
      lowStockProducts,
      monthlySales,
    };
  }

  async getAdminAnalytics(): Promise<AdminAnalytics> {
    await connectDB();

    const [
      totalUsers,
      totalBuyers,
      totalSellers,
      totalProducts,
      totalOrders,
      revenueStats,
      paymentCounts,
      topCategoriesAgg,
      monthlyGrowthAgg,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "buyer" }),
      User.countDocuments({ role: "seller" }),
      Product.countDocuments(),
      Payment.countDocuments(),
      Payment.aggregate([
        { $match: { status: { $in: ["paid", "CAPTURED"] } } },
        { $group: { _id: null, totalRevenue: { $sum: "$price.amount" } } },
      ]),
      Payment.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Payment.aggregate([
        { $match: { status: { $in: ["paid", "CAPTURED"] } } },
        { $unwind: "$orderItems" },
        {
          $lookup: {
            from: "products",
            localField: "orderItems.productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $group: {
            _id: "$product.category",
            count: { $sum: "$orderItems.quantity" },
            revenue: { $sum: { $multiply: ["$orderItems.price.amount", "$orderItems.quantity"] } },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      Payment.aggregate([
        {
          $match: {
            status: { $in: ["paid", "CAPTURED"] },
            createdAt: { $gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            revenue: { $sum: "$price.amount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const totalRevenue = revenueStats[0]?.totalRevenue || 0;

    const paymentMap: Record<string, number> = {};
    paymentCounts.forEach((p) => {
      paymentMap[p._id] = p.count;
    });

    const paidCount = (paymentMap.paid || 0) + (paymentMap.CAPTURED || 0);
    const pendingCount = (paymentMap.pending || 0) + (paymentMap.PENDING || 0);
    const failedCount = (paymentMap.failed || 0) + (paymentMap.FAILED || 0);
    const refundedCount = (paymentMap.REFUNDED || 0) + (paymentMap.PARTIALLY_REFUNDED || 0);

    const refundPayments = await Payment.find({ "refunds.0": { $exists: true } });
    let refundTotal = 0;
    let refundItemsCount = 0;
    refundPayments.forEach((p) => {
      p.refunds.forEach((r) => {
        refundTotal += r.amount;
        refundItemsCount++;
      });
    });

    const topCategories = topCategoriesAgg.map((item) => ({
      category: item._id || "Other",
      count: item.count,
      revenue: Math.round(item.revenue),
    }));

    const monthlyGrowth = monthlyGrowthAgg.map((item) => ({
      month: item._id,
      newUsers: 0,
      revenue: Math.round(item.revenue),
    }));

    return {
      totalUsers,
      totalBuyers,
      totalSellers,
      totalProducts,
      totalOrders,
      totalRevenue: Math.round(totalRevenue),
      paymentStats: {
        paid: paidCount,
        pending: pendingCount,
        failed: failedCount,
        refunded: refundedCount,
      },
      refundStats: {
        count: refundItemsCount,
        totalAmount: Math.round(refundTotal),
      },
      topCategories,
      monthlyGrowth,
    };
  }
}

export const analyticsService = new AnalyticsService();
