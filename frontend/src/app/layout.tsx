import type { Metadata, Viewport } from "next";

import { Providers } from "@/lib/providers";

import "./globals.css";
import "maplibre-gl/dist/maplibre-gl.css";

export const metadata: Metadata = {
  title: {
    default: "AeroShield BRICS — Pollution Intelligence & Climate Early Warning",
    template: "%s · AeroShield BRICS",
  },
  description:
    "Hyperlocal pollution intelligence combining citizen observations, multimodal AI analysis, " +
    "meteorological context, and predictive analytics for climate-resilient cities.",
  applicationName: "AeroShield BRICS",
  keywords: [
    "air quality",
    "pollution monitoring",
    "climate resilience",
    "environmental intelligence",
    "BRICS",
    "early warning",
  ],
  authors: [{ name: "AeroShield" }],
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#285d59",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-[var(--color-brand-600)] focus:px-3 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
