import { SpeedInsights } from "@vercel/speed-insights/next";
import type {
  Metadata,
  Viewport,
} from "next";
import { Suspense } from "react";

import "./globals.css";

import NavigationServer from "@/components/navigation/NavigationServer";

import {
  APP_NAME,
} from "@/lib/config";

export const metadata: Metadata = {
  title: {
    default: "aux.",
    template: "%s · aux.",
  },

  description:
    "Música, ligada à vida.",

  applicationName:
    APP_NAME,

  icons: {
    icon: [
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],

    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },

  manifest:
    "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#f7f7f5",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <SpeedInsights />

        {children}

        <Suspense fallback={null}>
          <NavigationServer />
        </Suspense>
      </body>
    </html>
  );
}