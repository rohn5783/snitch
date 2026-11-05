import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Join SNITCH" };

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}
