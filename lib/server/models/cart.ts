import mongoose, { Schema } from "mongoose";

const priceSchema = new Schema({
  amount: { type: Number, required: true },
  currency: { type: String, enum: ["USD", "EUR", "GBP", "JPY", "INR"], default: "INR" },
}, { _id: false });

const cartSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "user", required: true },
  items: [{
    product: { type: Schema.Types.ObjectId, ref: "product", required: true },
    variant: { type: Schema.Types.ObjectId, ref: "product.variants" },
    quantity: { type: Number, default: 1 },
    price: { type: priceSchema, required: true },
  }],
});

const Cart = mongoose.models.cart ?? mongoose.model("cart", cartSchema);
export default Cart;
