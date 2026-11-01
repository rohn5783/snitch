import mongoose from "mongoose";
import priceSchema from "./price.schema.js";


const paymentSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: [ "pending", "paid", "failed" ],
        default: "pending"
    },
    price: {
        type: priceSchema,
        required: true
    },
    razorpay: {
        orderId: String,
        paymentId: String,
        signature: String
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    orderItems: [
        {
            title: String,
            productId: mongoose.Schema.Types.ObjectId,
            sellerId: mongoose.Schema.Types.ObjectId,
            variantId: mongoose.Schema.Types.ObjectId,
            quantity: Number,
            fulfillmentStatus: {
                type: String,
                enum: [ "pending", "complete" ],
                default: "pending"
            },
            images: [ { url: String } ],
            description: String,
            price: priceSchema
        }
    ]
}, { timestamps: true })


const paymentModel = mongoose.model("payment", paymentSchema)

export default paymentModel;
