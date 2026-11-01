import { addItem, getCart, incrementCartItemApi, removeCartItem, createCartOrder, verifyCartOrder } from "../service/cart.api"
import { useDispatch } from "react-redux"
import { setCart, incrementCartItem, removeItem } from "../state/cart.slice"


export const useCart = () => {

    const dispatch = useDispatch()

    async function handleAddItem({ productId, variantId }) {
        const data = await addItem({ productId, variantId })
        return data
    }

    async function handleGetCart() {
        const data = await getCart()
        console.log(data)
        dispatch(setCart(data.cart))
    }

    async function handleIncrementCartItem({ productId, variantId }) {
        await incrementCartItemApi({ productId, variantId })
        dispatch(incrementCartItem({ productId, variantId }))
    }

    async function handleRemoveCartItem({ productId, variantId }) {
        dispatch(removeItem({ productId, variantId }))
        try {
            await removeCartItem({ productId, variantId })
        } catch (err) {
            console.error("Failed to remove cart item", err)
            // Re-fetch cart to restore correct state on error
            const data = await getCart()
            dispatch(setCart(data.cart))
        }
    }

    async function handleCreateCartOrder() {
        const data = await createCartOrder()
        return { ...data.order, keyId: data.keyId }
    }

    async function handleVerifyCartOrder({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
        const data = await verifyCartOrder({ razorpay_order_id, razorpay_payment_id, razorpay_signature })
        if (data.success) await handleGetCart()
        return data.success
    }

    return {
        handleAddItem,
        handleGetCart,
        handleIncrementCartItem,
        handleRemoveCartItem,
        handleCreateCartOrder,
        handleVerifyCartOrder,
    }

}
