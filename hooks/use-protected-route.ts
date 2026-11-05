"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/store-provider";

export function useProtectedRoute(role?: "buyer" | "seller") {
  const { user, authLoading } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
    else if (role && user.role !== role) router.replace("/");
  }, [authLoading, user, role, router]);

  return { user, ready: !authLoading && Boolean(user) && (!role || user?.role === role) };
}
