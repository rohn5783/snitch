import type { Product } from "@/types/store";

type ApiEnvelope<T> = T & {
  message?: string;
  success?: boolean;
};

type ErrorEnvelope = {
  message?: string;
  errors?: Array<{ msg?: string }>;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiEnvelope<T>> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`/api${path}`, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    const errorPayload = payload as ErrorEnvelope | null;
    const message =
      errorPayload?.message ??
      errorPayload?.errors?.[0]?.msg ??
      `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return payload as ApiEnvelope<T>;
}

export const jsonBody = (value: unknown) => JSON.stringify(value);

export function formatPrice(amount = 0, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`;
  }
}

export function productImage(product: Pick<Product, "images">) {
  return product.images?.[0]?.url || "/snitch_editorial.png";
}
