import paymentModel from "../models/payment.model.js";
import productModel from "../models/product.model.js";
import mongoose from "mongoose";

export const getUserOrders = async (req, res) => {
    const orders = await paymentModel.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({
        message: "Orders fetched successfully",
        success: true,
        orders
    });
};

export const getSellerOrders = async (req, res) => {
    const sellerId = req.user._id.toString();
    const products = await productModel.find({ seller: req.user._id }).select("_id");
    const sellerProductIds = new Set(products.map(product => product._id.toString()));

    if (sellerProductIds.size === 0) {
        return res.status(200).json({ message: "Seller orders fetched successfully", success: true, orders: [] });
    }

    const orders = await paymentModel.find({
        status: "paid",
        "orderItems.productId": { $in: Array.from(sellerProductIds) }
    }).populate("user", "fullname email contact").sort({ createdAt: -1 });

    const sellerOrders = orders.map(order => {
        const orderItems = order.orderItems.filter(item => {
            const itemSellerId = item.sellerId?.toString();
            return itemSellerId ? itemSellerId === sellerId : sellerProductIds.has(item.productId.toString());
        }).map(item => ({
            ...item.toObject(),
            fulfillmentStatus: item.fulfillmentStatus || "pending"
        }));

        const sellerTotal = orderItems.reduce((total, item) =>
            total + (Number(item.price?.amount) || 0) * (Number(item.quantity) || 0), 0);
        const fulfillmentStatus = orderItems.length > 0 && orderItems.every(item => item.fulfillmentStatus === "complete")
            ? "complete"
            : "pending";

        return {
            _id: order._id,
            createdAt: order.createdAt,
            razorpay: order.razorpay,
            paymentStatus: order.status,
            buyer: order.user,
            orderItems,
            sellerTotal,
            currency: order.price.currency,
            fulfillmentStatus
        };
    }).filter(order => order.orderItems.length > 0);

    return res.status(200).json({
        message: "Seller orders fetched successfully",
        success: true,
        orders: sellerOrders
    });
};

export const updateSellerOrderStatus = async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    if (![ "pending", "complete" ].includes(status)) {
        return res.status(400).json({
            message: "Status must be either pending or complete",
            success: false
        });
    }

    if (!mongoose.isValidObjectId(orderId)) {
        return res.status(400).json({ message: "Invalid order ID", success: false });
    }

    const products = await productModel.find({ seller: req.user._id }).select("_id");
    const sellerProductIds = new Set(products.map(product => product._id.toString()));
    const order = await paymentModel.findOne({ _id: orderId, status: "paid" });

    if (!order) {
        return res.status(404).json({ message: "Paid order not found", success: false });
    }

    const ownedItems = order.orderItems.filter(item => {
        const itemSellerId = item.sellerId?.toString();
        return itemSellerId ? itemSellerId === req.user._id.toString() : sellerProductIds.has(item.productId.toString());
    });

    if (ownedItems.length === 0) {
        return res.status(404).json({ message: "Order does not contain your products", success: false });
    }

    for (const item of ownedItems) {
        if (!item.sellerId) item.sellerId = req.user._id;
        item.fulfillmentStatus = status;
    }
    await order.save();

    return res.status(200).json({
        message: "Order fulfillment status updated",
        success: true,
        status
    });
};

