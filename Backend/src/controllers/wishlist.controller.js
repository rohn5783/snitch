import wishlistModel from "../models/wishlist.model.js";

export const getWishlist = async (req, res) => {
    let wishlist = await wishlistModel.findOne({ user: req.user._id }).populate("products");
    if (!wishlist) {
        wishlist = await wishlistModel.create({ user: req.user._id, products: [] });
    }
    return res.status(200).json({
        message: "Wishlist fetched successfully",
        success: true,
        wishlist
    });
};

export const addToWishlist = async (req, res) => {
    const { productId } = req.params;
    let wishlist = await wishlistModel.findOne({ user: req.user._id });
    if (!wishlist) {
        wishlist = await wishlistModel.create({ user: req.user._id, products: [productId] });
    } else {
        const isPresent = wishlist.products.some(id => id.toString() === productId);
        if (!isPresent) {
            wishlist.products.push(productId);
            await wishlist.save();
        }
    }
    return res.status(200).json({
        message: "Product added to wishlist",
        success: true,
        wishlist
    });
};

export const removeFromWishlist = async (req, res) => {
    const { productId } = req.params;
    const wishlist = await wishlistModel.findOne({ user: req.user._id });
    if (wishlist) {
        wishlist.products = wishlist.products.filter(id => id.toString() !== productId);
        await wishlist.save();
    }
    return res.status(200).json({
        message: "Product removed from wishlist",
        success: true,
        wishlist
    });
};

