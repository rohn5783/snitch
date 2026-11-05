"use client";

import { useStore } from "@/components/store-provider";

export function ToastViewport() {
  const { toast } = useStore();
  return (
    <div
      className={`toast toast--${toast?.kind ?? "success"} ${toast ? "toast--visible" : ""}`}
      role="status"
      aria-live="polite"
    >
      {toast?.message}
    </div>
  );
}
