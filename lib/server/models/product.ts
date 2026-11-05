import mongoose, { Schema } from "mongoose";

const priceSchema = new Schema({
  amount: { type: Number, required: true },
  currency: { type: String, enum: ["USD", "EUR", "GBP", "JPY", "INR"], default: "INR" },
}, { _id: false });

const imageSchema = new Schema({ url: { type: String, required: true } }, { _id: false });

const variantSchema = new Schema({
  images: [imageSchema],
  stock: { type: Number, default: 0 },
  attributes: { type: Map, of: String },
  price: priceSchema,
});

const productSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, trim: true, default: "Other" },
  sku: { type: String, trim: true, default: "" },
  isActive: { type: Boolean, default: true },
  seller: { type: Schema.Types.ObjectId, ref: "user", required: true },
  price: { type: priceSchema, required: true },
  images: [imageSchema],
  variants: [variantSchema],
}, { timestamps: true });

const Product = mongoose.models.product ?? mongoose.model("product", productSchema);
export default Product;
