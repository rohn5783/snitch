import cartModel from "../models/cart.model.js";
import productModel from "../models/product.model.js";
import { stockOfVariant } from "../dao/product.dao.js";
import mongoose from "mongoose";
import { createOrder } from "../services/payment.service.js";
import { getCartDetails } from "../dao/cart.dao.js";
import paymentModel from "../models/payment.model.js";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils.js";
import { config } from "../config/config.js";




export const addToCart = async (req, res) => {

    const { productId, variantId } = req.params
    const { quantity = 1 } = req.body

    const product = await productModel.findOne({
        _id: productId,
        "variants._id": variantId
    })

    if (!product) {
        return res.status(404).json({
            message: "Product or variant not found",
            success: false
        })
    }

    const stock = await stockOfVariant(productId, variantId)

    const cart = (await cartModel.findOne({ user: req.user._id })) ||
        (await cartModel.create({ user: req.user._id }))

    const isProductAlreadyInCart = cart.items.some(item => item.product.toString() === productId && item.variant?.toString() === variantId)

    if (isProductAlreadyInCart) {
        const quantityInCart = cart.items.find(item => item.product.toString() === productId && item.variant?.toString() === variantId).quantity
        if (quantityInCart + quantity > stock) {
            return res.status(400).json({
                message: `Only ${stock} items left in stock. and you already have ${quantityInCart} items in your cart`,
                success: false
            })
        }

        await cartModel.findOneAndUpdate(
            { user: req.user._id, "items.product": productId, "items.variant": variantId },
            { $inc: { "items.$.quantity": quantity } },
            { new: true }
        )

        return res.status(200).json({
            message: "Cart updated successfully",
            success: true
        })
    }

    if (quantity > stock) {
        return res.status(400).json({
            message: `Only ${stock} items left in stock`,
            success: false
        })
    }

    cart.items.push({
        product: productId,
        variant: variantId,
        quantity,
        price: product.price
    })

    await cart.save()

    return res.status(200).json({
        message: "Product added to cart successfully",
        success: true
    })
}

export const getCart = async (req, res) => {
    const user = req.user

    let cart = await getCartDetails(user._id)

    if (!cart) {
        cart = await cartModel.create({ user: user._id })
    }

    return res.status(200).json({
        message: "Cart fetched successfully",
        success: true,
        cart
    })
}

export const incrementCartItemQuantity = async (req, res) => {
    const { productId, variantId } = req.params

    const product = await productModel.findOne({
        _id: productId,
        "variants._id": variantId
    })

    if (!product) {
        return res.status(404).json({
            message: "Product or variant not found",
            success: false
        })
    }

    const cart = await cartModel.findOne({ user: req.user._id })

    if (!cart) {
        return res.status(404).json({
            message: "Cart not found",
            success: false
        })
    }

    const stock = await stockOfVariant(productId, variantId)

    const itemQuantityInCart = cart.items.find(item => item.product.toString() === productId && item.variant?.toString() === variantId)?.quantity || 0

    if (itemQuantityInCart + 1 > stock) {
        return res.status(400).json({
            message: `Only ${stock} items left in stock. and you already have ${itemQuantityInCart} items in your cart`,
            success: false
        })
    }

    await cartModel.findOneAndUpdate(
        { user: req.user._id, "items.product": productId, "items.variant": variantId },
        { $inc: { "items.$.quantity": 1 } },
        { new: true }
    )

    return res.status(200).json({
        message: "Cart item quantity incremented successfully",
        success: true
    })
}

export const createOrderController = async (req, res) => {


    const cart = await getCartDetails(req.user._id)

    if (!cart) {
        return res.status(400).json({
            message: "Cart is empty",
            success: false
        })
    }

    const order = await createOrder({ amount: cart.totalPrice, currency: cart.currency })

    const payment = await paymentModel.create({
        user: req.user._id,
        razorpay: {
            orderId: order.id,
        },
        price: {
            amount: cart.totalPrice,
            currency: cart.currency
        },
        orderItems: cart.items.map(item => ({
            title: item.product.title,
            productId: item.product._id,
            sellerId: item.product.seller,
            variantId: item.variant,
            quantity: item.quantity,
            images: item.product.variants.images || item.product.images,
            description: item.product.description,
            price: {
                amount: item.product.variants.price.amount || item.product.price.amount,
                currency: item.product.variants.price.currency || item.product.price.currency
            }
        }))
    })

    return res.status(200).json({
        message: "Order created successfully",
        success: true,
        keyId: config.RAZORPAY_KEY_ID,
        order
    })
}

export const verifyOrderController = async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
    } = req.body

    const isPaymentValid = validatePaymentVerification({
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
    }, razorpay_signature, config.RAZORPAY_KEY_SECRET)

    if (!isPaymentValid) {
        return res.status(400).json({
            message: "Payment verification failed",
            success: false
        })
    }

    const session = await mongoose.startSession()
    let alreadyProcessed = false

    try {
        await session.withTransaction(async () => {
            const payment = await paymentModel.findOne({
                "razorpay.orderId": razorpay_order_id,
                user: req.user._id
            }).session(session)

            if (!payment) {
                const error = new Error("Payment not found")
                error.statusCode = 404
                throw error
            }

            if (payment.status === "paid") {
                if (payment.razorpay.paymentId !== razorpay_payment_id) {
                    const error = new Error("Order was already paid with a different payment")
                    error.statusCode = 409
                    throw error
                }
                alreadyProcessed = true
                return
            }

            if (payment.status !== "pending") {
                const error = new Error("Payment is not pending")
                error.statusCode = 409
                throw error
            }

            for (const item of payment.orderItems) {
                const result = await productModel.updateOne({
                    _id: item.productId,
                    variants: {
                        $elemMatch: {
                            _id: item.variantId,
                            stock: { $gte: item.quantity }
                        }
                    }
                }, {
                    $inc: { "variants.$.stock": -item.quantity }
                }, { session })

                if (result.modifiedCount !== 1) {
                    const error = new Error(`Insufficient stock for ${item.title}`)
                    error.statusCode = 409
                    throw error
                }
            }

            const cart = await cartModel.findOne({ user: req.user._id }).session(session)
            if (cart) {
                for (const purchasedItem of payment.orderItems) {
                    const cartItem = cart.items.find(item =>
                        item.product.toString() === purchasedItem.productId.toString() &&
                        item.variant?.toString() === purchasedItem.variantId.toString()
                    )

                    if (!cartItem) continue

                    cartItem.quantity -= purchasedItem.quantity
                    if (cartItem.quantity <= 0) {
                        cart.items.pull(cartItem._id)
                    }
                }
                await cart.save({ session })
            }

            payment.status = "paid"
            payment.razorpay.paymentId = razorpay_payment_id
            payment.razorpay.signature = razorpay_signature
            await payment.save({ session })
        })

        return res.status(200).json({
            message: alreadyProcessed ? "Payment was already processed" : "Payment verified and inventory updated",
            success: true
        })
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.statusCode ? error.message : "Could not update inventory for this order",
            success: false
        })
    } finally {
        await session.endSession()
    }
}


export const removeFromCart = async (req, res) => {
    const { productId, variantId } = req.params;

    const cart = await cartModel.findOne({ user: req.user._id });

    if (!cart) {
        return res.status(404).json({
            message: "Cart not found",
            success: false
        });
    }

    cart.items = cart.items.filter(item => {
        const matchesProduct = item.product.toString() === productId;
        const matchesVariant = variantId ? item.variant?.toString() === variantId : true;
        return !(matchesProduct && matchesVariant);
    });

    await cart.save();

    return res.status(200).json({
        message: "Item removed from cart successfully",
        success: true
    });
};
