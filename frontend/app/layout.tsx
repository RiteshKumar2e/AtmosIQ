import type { Metadata, Viewport } from "next";

import { Providers } from "@/app/providers";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";

import "./globals.css";

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
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
