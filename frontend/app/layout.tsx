import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { Providers } from "@/app/providers";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";

import "./globals.css";

/**
 * Self-hosted at build time, so there is no render-blocking request to a font
 * CDN and no layout shift. `display: swap` keeps text visible while loading.
 */
// Variable fonts: one file per family covering every weight, instead of a
// separate static file per weight. That cuts the preload count dramatically
// and, unlike static weights, actually honours the intermediate values the
// design system uses (620, 640, 660).
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-loaded",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono-loaded",
  // Monospace is used for small labels and codes well below the fold, so it
  // does not need to compete with the body font for early bandwidth.
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Hyperlocal Air Pollution Intelligence`,
    template: `%s — ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    "air quality",
    "pollution monitoring",
    "climate resilience",
    "early warning",
    "environmental intelligence",
    "BRICS",
  ],
  openGraph: {
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    type: "website",
    siteName: APP_NAME,
  },
  icons: {
    icon: "/icons/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f6f66",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // `data-scroll-behavior` opts in to Next.js's upcoming behaviour, where
    // smooth scrolling is no longer auto-disabled during route transitions.
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        {/* Scroll-reveal starts sections transparent and JS fades them in.
            Without JS that would hide the page, so force them visible. */}
        <noscript>
          <style>{`.reveal { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>

        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
