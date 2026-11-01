import { useDispatch, useSelector } from "react-redux";
import { setWishlist, addToWishlist, removeFromWishlist } from "../state/wishlist.slice";
import { getWishlist, addToWishlistApi, removeFromWishlistApi } from "../service/wishlist.api";

export const useWishlist = () => {
    const dispatch = useDispatch();
    const wishlistItems = useSelector(state => state.wishlist.items);

    const isWishlisted = (productId) => wishlistItems.includes(productId);

    async function handleGetWishlist() {
        try {
            const data = await getWishlist();
            // data.wishlist.products is an array of populated product objects
            const ids = (data.wishlist?.products || []).map(p =>
                typeof p === "string" ? p : p._id
            );
            dispatch(setWishlist(ids));
            return data.wishlist;
        } catch (err) {
            console.error("Failed to fetch wishlist", err);
        }
    }

    async function handleAddToWishlist(productId) {
        dispatch(addToWishlist(productId));
        try {
            await addToWishlistApi(productId);
        } catch (err) {
            dispatch(removeFromWishlist(productId)); // rollback
            throw err;
        }
    }

    async function handleRemoveFromWishlist(productId) {
        dispatch(removeFromWishlist(productId));
        try {
            await removeFromWishlistApi(productId);
        } catch (err) {
            dispatch(addToWishlist(productId)); // rollback
            throw err;
        }
    }

    async function handleToggleWishlist(productId) {
        if (isWishlisted(productId)) {
            await handleRemoveFromWishlist(productId);
            return false;
        } else {
            await handleAddToWishlist(productId);
            return true;
        }
    }

    return {
        wishlistItems,
        isWishlisted,
        handleGetWishlist,
        handleAddToWishlist,
        handleRemoveFromWishlist,
        handleToggleWishlist,
    };
};

