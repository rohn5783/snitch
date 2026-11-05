import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { StoreProvider } from "@/components/store-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ToastViewport } from "@/components/toast-viewport";
import { PageTransition } from "@/components/page-transition";
import "./globals.scss";

const sans = Manrope({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], display: "swap", variable: "--font-sans" });
const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], display: "swap", variable: "--font-serif" });

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
    <html lang="en" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
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
