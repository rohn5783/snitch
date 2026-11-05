import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { StoreProvider } from "@/components/store-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ToastViewport } from "@/components/toast-viewport";
import { PageTransition } from "@/components/page-transition";
import "./globals.scss";

export const metadata: Metadata = {
  title: {
    default: "SNITCH — Dress like you mean it.",
    template: "%s — SNITCH",
  },
  description:
    "Considered pieces. Independent voices. A new point of view on what you wear.",
  applicationName: "SNITCH",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111110",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <SiteHeader />
          <main id="main-content"><PageTransition>{children}</PageTransition></main>
          <SiteFooter />
          <ToastViewport />
        </StoreProvider>
      </body>
    </html>
  );
}
