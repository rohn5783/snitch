import mongoose, { Schema } from "mongoose";

const wishlistSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "user", required: true, unique: true },
  products: [{ type: Schema.Types.ObjectId, ref: "product" }],
}, { timestamps: true });

const Wishlist = mongoose.models.wishlist ?? mongoose.model("wishlist", wishlistSchema);
export default Wishlist;
