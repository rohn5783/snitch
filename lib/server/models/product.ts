import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IPrice {
  amount: number;
  currency: string;
}

export interface IProductImage {
  url: string;
}

export interface IProductVariant {
  _id: mongoose.Types.ObjectId;
  sku?: string;
  images: IProductImage[];
  stock: number;
  reservedStock: number;
  soldStock: number;
  attributes: Map<string, string>;
  price?: IPrice;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: string;
  sku?: string;
  isActive: boolean;
  seller: mongoose.Types.ObjectId;
  price: IPrice;
  images: IProductImage[];
  variants: mongoose.Types.DocumentArray<IProductVariant & mongoose.Types.Subdocument>;
  averageRating: number;
  reviewCount: number;
  totalSold: number;
  modelUrl?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const priceSchema = new Schema<IPrice>(
  {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, enum: ["USD", "EUR", "GBP", "JPY", "INR"], default: "INR" },
  },
  { _id: false },
);

const imageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
  },
  { _id: false },
);

const variantSchema = new Schema<IProductVariant>(
  {
    sku: { type: String, trim: true },
    images: [imageSchema],
    stock: { type: Number, default: 0, min: 0 },
    reservedStock: { type: Number, default: 0, min: 0 },
    soldStock: { type: Number, default: 0, min: 0 },
    attributes: { type: Map, of: String },
    price: priceSchema,
    status: {
      type: String,
      enum: ["in_stock", "low_stock", "out_of_stock"],
      default: "in_stock",
    },
  },
  { _id: true },
);

variantSchema.pre("save", function () {
  if (this.stock <= 0) {
    this.status = "out_of_stock";
  } else if (this.stock <= 5) {
    this.status = "low_stock";
  } else {
    this.status = "in_stock";
  }
});

const productSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, trim: true, default: "Other", index: true },
    sku: { type: String, trim: true, default: "", index: true },
    isActive: { type: Boolean, default: true, index: true },
    seller: { type: Schema.Types.ObjectId, ref: "user", required: true, index: true },
    price: { type: priceSchema, required: true },
    images: [imageSchema],
    variants: [variantSchema],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    totalSold: { type: Number, default: 0, min: 0 },
    modelUrl: { type: String, trim: true },
    tags: [{ type: String, trim: true, lowercase: true }],
  },
  { timestamps: true },
);

// Compound indexes for high-concurrency e-commerce queries
productSchema.index({ category: 1, isActive: 1, "price.amount": 1 });
productSchema.index({ seller: 1, createdAt: -1 });
productSchema.index({ isActive: 1, averageRating: -1 });
productSchema.index({ isActive: 1, createdAt: -1 });

// Full text index for scalable search
productSchema.index(
  {
    title: "text",
    description: "text",
    category: "text",
    tags: "text",
  },
  {
    weights: {
      title: 10,
      tags: 5,
      category: 3,
      description: 1,
    },
    name: "ProductTextIndex",
  },
);

const Product = (mongoose.models.product as Model<IProduct>) ?? mongoose.model<IProduct>("product", productSchema);
export default Product;
