"use client";

import { usePathname } from "next/navigation";

import BottomNavigation from "@/components/navigation/BottomNavigation";

export default function AppNavigation({
  signedIn,
}: {
  signedIn: boolean;
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

  return <BottomNavigation />;
}