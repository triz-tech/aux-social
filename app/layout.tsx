import { SpeedInsights } from "@vercel/speed-insights/next";
import type {
  Metadata,
  Viewport,
} from "next";

import "./globals.css";


import InstallPrompt from "@/components/pwa/InstallPrompt";
import InteractionGuard from "@/components/ui/InteractionGuard";
import AppNavigation from "@/components/navigation/AppNavigation";


import {
  APP_NAME,
  IS_DEMO,
} from "@/lib/config";

import { getViewer } from "@/lib/auth/viewer";

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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer =
  await getViewer();

  return (
    <html lang="pt-BR">
      <body>
        <SpeedInsights />
        <InteractionGuard />
        <InstallPrompt
  signedIn={viewer.signedIn}
/>

        {children}

<AppNavigation
  signedIn={viewer.signedIn}
  viewerId={viewer.id}
  username={viewer.username}
/>
      </body>
    </html>
  );
}
