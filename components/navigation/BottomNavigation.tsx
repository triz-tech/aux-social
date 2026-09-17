"use client";

import {
  Activity,
  Compass,
  Home,
  Plus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import CreateSheet from "@/components/composer/CreateSheet";
import { IS_DEMO } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

export default function BottomNavigation() {
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);
  const [profileHref, setProfileHref] = useState(
    IS_DEMO ? "/u/demo" : "/login"
  );

  useEffect(() => {
    if (IS_DEMO) {
      setProfileHref("/u/demo");
      return;
    }

    let mounted = true;

    async function loadMyProfile() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (!user) {
          setProfileHref("/login");
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;
        if (!mounted) return;

        setProfileHref(
          profile?.username
            ? `/u/${profile.username}`
            : "/onboarding"
        );
      } catch {
        if (mounted) setProfileHref("/login");
      }
    }

    void loadMyProfile();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadMyProfile();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <nav className="bottomNav" aria-label="Navegação principal">
        <Link
          className={`navItem ${pathname === "/" ? "active" : ""}`}
          href="/"
        >
          <Home size={21} strokeWidth={1.8} />
          <span>Home</span>
        </Link>

        <Link
          className={`navItem ${
            pathname.startsWith("/discover") ? "active" : ""
          }`}
          href="/discover"
        >
          <Compass size={21} strokeWidth={1.8} />
          <span>Discover</span>
        </Link>

        <button
          className="createBtn"
          aria-label="Adicionar música"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={30} strokeWidth={1.8} />
        </button>

        <Link
          className={`navItem ${
            pathname.startsWith("/activity") ? "active" : ""
          }`}
          href="/activity"
        >
          <Activity size={21} strokeWidth={1.8} />
          <span>Activity</span>
        </Link>

        <Link
          className={`navItem ${
            pathname.startsWith("/u/") ? "active" : ""
          }`}
          href={profileHref}
        >
          <UserRound size={21} strokeWidth={1.8} />
          <span>Profile</span>
        </Link>
      </nav>

      <CreateSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </>
  );
}
