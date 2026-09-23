import type {
  Metadata,
  Viewport,
} from "next";

import "./globals.css";

import InstallPrompt from "@/components/pwa/InstallPrompt";
import InteractionGuard from "@/components/ui/InteractionGuard";
import AppNavigation from "@/components/navigation/AppNavigation";
import { getCurrentUser } from "@/lib/auth/current-user";

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

  let viewerId: string | null =
    IS_DEMO ? "demo" : null;

  let username: string | null =
    IS_DEMO ? "demo" : null;

  if (!IS_DEMO) {
    try {
const user =
  await getCurrentUser();

const supabase =
  await createClient();

      signedIn = !!user;

      viewerId =
        user?.id ?? null;

      if (user) {
        const {
          data: profile,
        } =
          await supabase
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .maybeSingle();

        username =
          profile?.username ??
          null;
      }
    } catch {
      signedIn = false;
      viewerId = null;
      username = null;
    }
  }

  return (
    <html lang="pt-BR">
      <body>
        <InteractionGuard />
        <InstallPrompt signedIn={signedIn} />

        {children}

        <AppNavigation
          signedIn={signedIn}
          viewerId={viewerId}
          username={username}
        />
      </body>
    </html>
  );
}
