"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, jsonBody } from "@/lib/api";
import type { Cart, Product, User } from "@/types/store";

type StoreContextValue = {
  user: User | null;
  authLoading: boolean;
  wishlist: string[];
  cart: Cart;
  cartLoading: boolean;
  toast: { message: string; kind: "success" | "error"; id: number } | null;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (input: {
    fullname: string;
    contact: string;
    email: string;
    password: string;
    isSeller: boolean;
  }) => Promise<User>;
  signOut: () => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
  addToCart: (productId: string, variantId: string) => Promise<void>;
  toggleWishlist: (productId: string) => Promise<void>;
  removeCartItem: (productId: string, variantId: string) => Promise<void>;
  incrementCartItem: (productId: string, variantId: string) => Promise<void>;
  notify: (message: string, kind?: "success" | "error") => void;
};

const emptyCart: Cart = { items: [], totalPrice: 0, currency: "INR" };
const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [cartLoading, setCartLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error"; id: number } | null>(null);

  const refreshCart = useCallback(async () => {
    setCartLoading(true);
    try {
      const response = await api<{ cart: Cart }>("/cart");
      setCart(response.cart ?? emptyCart);
    } finally {
      setCartLoading(false);
    }
  }, []);

  const refreshWishlist = useCallback(async () => {
    const response = await api<{ wishlist: { products: Array<string | Product> } }>("/wishlist");
    setWishlist((response.wishlist?.products ?? []).map((product) =>
      typeof product === "string" ? product : product._id,
    ));
  }, []);

  const notify = useCallback((message: string, kind: "success" | "error" = "success") => {
    setToast({ message, kind, id: Date.now() });
  }, []);

  useEffect(() => {
    let active = true;
    api<{ user: User }>("/auth/me")
      .then(async (response) => {
        if (!active) return;
        setUser(response.user);
        const results = await Promise.allSettled([refreshCart(), refreshWishlist()]);
        if (active) {
          results.forEach((result) => {
            if (result.status === "rejected") console.error("Could not restore account data", result.reason);
          });
        }
      })
      .catch((error: unknown) => {
        if (!(error instanceof Error && "status" in error && error.status === 401)) {
          console.error("Could not restore the signed-in session", error);
        }
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => { active = false; };
  }, [refreshCart, refreshWishlist]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await api<{ user: User }>("/auth/login", {
      method: "POST",
      body: jsonBody({ email, password }),
    });
    setUser(response.user);
    await Promise.all([refreshCart(), refreshWishlist()]);
    return response.user;
  }, [refreshCart, refreshWishlist]);

  const signUp = useCallback(async (input: {
    fullname: string;
    contact: string;
    email: string;
    password: string;
    isSeller: boolean;
  }) => {
    const response = await api<{ user: User }>("/auth/register", {
      method: "POST",
      body: jsonBody(input),
    });
    setUser(response.user);
    await Promise.all([refreshCart(), refreshWishlist()]);
    return response.user;
  }, [refreshCart, refreshWishlist]);

  const signOut = useCallback(async () => {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    setCart(emptyCart);
    setWishlist([]);
  }, []);

  const addToCart = useCallback(async (productId: string, variantId: string) => {
    await api(`/cart/add/${productId}/${variantId}`, {
      method: "POST",
      body: jsonBody({ quantity: 1 }),
    });
    await refreshCart();
  }, [refreshCart]);

  const toggleWishlist = useCallback(async (productId: string) => {
    if (wishlist.includes(productId)) {
      await api(`/wishlist/remove/${productId}`, { method: "DELETE" });
      setWishlist((items) => items.filter((id) => id !== productId));
    } else {
      await api(`/wishlist/add/${productId}`, { method: "POST" });
      setWishlist((items) => [...items, productId]);
    }
  }, [wishlist]);

  const removeCartItem = useCallback(async (productId: string, variantId: string) => {
    await api(`/cart/remove/${productId}/${variantId}`, { method: "DELETE" });
    await refreshCart();
  }, [refreshCart]);

  const incrementCartItem = useCallback(async (productId: string, variantId: string) => {
    await api(`/cart/quantity/increment/${productId}/${variantId}`, { method: "PATCH" });
    await refreshCart();
  }, [refreshCart]);

  const value = useMemo<StoreContextValue>(() => ({
    user, authLoading, wishlist, cart, cartLoading, signIn, signUp, signOut,
    toast,
    refreshCart, refreshWishlist, addToCart, toggleWishlist, removeCartItem,
    incrementCartItem, notify,
  }), [
    user, authLoading, wishlist, cart, cartLoading, toast, signIn, signUp, signOut,
    refreshCart, refreshWishlist, addToCart, toggleWishlist, removeCartItem,
    incrementCartItem, notify,
  ]);

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used within StoreProvider");
  return context;
}
