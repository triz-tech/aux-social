"use client";

import { usePathname } from "next/navigation";

import BottomNavigation from "@/components/navigation/BottomNavigation";

export default function AppNavigation({
  signedIn,
  viewerId,
  username,
}: {
  signedIn: boolean;
  viewerId: string | null;
  username: string | null;
}) {
  const pathname =
    usePathname();

  /*
   * Usuário deslogado não recebe
   * a navegação do aplicativo.
   */
  if (!signedIn) {
    return null;
  }

  /*
   * Essas telas têm experiência
   * própria.
   */
  const hidden =
    pathname === "/login" ||
    pathname === "/onboarding" ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/auth/");

  if (hidden) {
    return null;
  }

  return (
    <BottomNavigation
      viewerId={viewerId}
      username={username}
    />
  );
}
