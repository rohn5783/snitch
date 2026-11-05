export type User = {
  id: string;
  fullname: string;
  email: string;
  contact?: string;
  role: "buyer" | "seller";
};

export type Price = {
  amount: number;
  currency: string;
};

export type ProductImage = {
  url: string;
};

export type ProductVariant = {
  _id: string;
  attributes: Record<string, string>;
  images: ProductImage[];
  stock: number;
  price?: Price;
};

export type Product = {
  _id: string;
  title: string;
  description: string;
  price: Price;
  images: ProductImage[];
  variants: ProductVariant[];
  modelUrl?: string;
  createdAt?: string;
};

export type CartItem = {
  _id: string;
  product: Product;
  variant: ProductVariant;
  quantity: number;
  price?: Price;
};

export type Cart = {
  items: CartItem[];
  totalPrice: number;
  currency: string;
};

export type OrderItem = {
  _id: string;
  title: string;
  productId: string;
  variantId: string;
  quantity: number;
  fulfillmentStatus?: "pending" | "complete";
  images: ProductImage[];
  price: Price;
};

export type Order = {
  _id: string;
  status?: "pending" | "paid" | "failed";
  paymentStatus?: string;
  price?: Price;
  sellerTotal?: number;
  currency?: string;
  razorpay?: { orderId?: string };
  buyer?: { fullname?: string; email?: string; contact?: string };
  orderItems: OrderItem[];
  createdAt: string;
  fulfillmentStatus?: "pending" | "complete";
};
