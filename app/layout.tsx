import type {
  Metadata,
  Viewport,
} from "next";

import "./globals.css";
import InstallPrompt from "@/components/pwa/InstallPrompt";

import AppNavigation from "@/components/navigation/AppNavigation";

import {
  APP_NAME,
  IS_DEMO,
} from "@/lib/config";

import { createClient } from "@/lib/supabase/server";

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
  let signedIn = IS_DEMO;

  if (!IS_DEMO) {
    try {
      const supabase =
        await createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      signedIn = !!user;
    } catch {
      signedIn = false;
    }
  }

  return (
    <html lang="pt-BR">
      <body>
        <InstallPrompt />
        {children}

        <AppNavigation
          signedIn={signedIn}
        />
      </body>
    </html>
  );
}