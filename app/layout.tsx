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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=Manrope:wght@300;400;500;600;700&display=swap"
        />
      </head>
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
