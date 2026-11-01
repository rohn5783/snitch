import express from "express";
import { authenticateSeller, authenticateUser } from "../middlewares/auth.middleware.js";
import { getSellerOrders, getUserOrders, updateSellerOrderStatus } from "../controllers/orders.controller.js";

const router = express.Router();

router.get("/", authenticateUser, getUserOrders);
router.get("/seller", authenticateSeller, getSellerOrders);
router.patch("/seller/:orderId/fulfillment", authenticateSeller, updateSellerOrderStatus);

export default router;

