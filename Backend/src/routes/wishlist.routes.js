import express from "express";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { getWishlist, addToWishlist, removeFromWishlist } from "../controllers/wishlist.controller.js";

const router = express.Router();

router.get("/", authenticateUser, getWishlist);
router.post("/add/:productId", authenticateUser, addToWishlist);
router.delete("/remove/:productId", authenticateUser, removeFromWishlist);

export default router;

