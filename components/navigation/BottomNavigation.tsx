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

  const [unreadCount, setUnreadCount] =
    useState(0);

  /*
   * ======================================================
   * TEMA
   * ======================================================
   *
   * A navegação apenas aplica a preferência salva para que
   * o dark mode continue funcionando em todas as páginas.
   * O botão de troca fica no cabeçalho do próprio perfil.
   */
  useEffect(() => {
    const saved =
      localStorage.getItem(
        "aux-theme"
      );

    const next =
      saved === "dark" ||
      saved === "light"
        ? saved
        : window.matchMedia(
            "(prefers-color-scheme: dark)"
          ).matches
          ? "dark"
          : "light";

    document.documentElement
      .dataset.theme = next;
  }, []);

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

  /*
   * ======================================================
   * NOTIFICAÇÕES NÃO LIDAS
   * ======================================================
   *
   * Mostra uma bolinha em Activity quando existe pelo
   * menos uma notificação com read_at = null.
   *
   * Ao entrar em Activity, marca as notificações como lidas.
   * Também atualiza ao voltar para a aba/janela e em um
   * intervalo curto, sem depender do Realtime do Supabase.
   */
  useEffect(() => {
    if (IS_DEMO) {
      setUnreadCount(0);
      return;
    }

    let active = true;
    const supabase = createClient();

    async function refreshUnread() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!active) return;

        if (!user) {
          setUnreadCount(0);
          return;
        }

        if (
          pathname.startsWith("/activity")
        ) {
          setUnreadCount(0);

          await supabase
            .from("notifications")
            .update({
              read_at:
                new Date().toISOString(),
            })
            .eq(
              "recipient_id",
              user.id
            )
            .is("read_at", null);

          return;
        }

        const {
          count,
          error,
        } = await supabase
          .from("notifications")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq(
            "recipient_id",
            user.id
          )
          .is("read_at", null);

        if (error) {
          throw error;
        }

        if (active) {
          setUnreadCount(
            count ?? 0
          );
        }
      } catch {
        /*
         * A navegação continua funcionando mesmo se a
         * checagem da bolinha falhar.
         */
      }
    }

    function handleFocus() {
      void refreshUnread();
    }

    void refreshUnread();

    window.addEventListener(
      "focus",
      handleFocus
    );

    const interval =
      window.setInterval(
        () => {
          void refreshUnread();
        },
        20_000
      );

    return () => {
      active = false;

      window.removeEventListener(
        "focus",
        handleFocus
      );

      window.clearInterval(
        interval
      );
    };
  }, [pathname]);

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
          <span
            style={{
              position: "relative",
              display: "inline-grid",
              placeItems: "center",
            }}
          >
            <Activity
              size={21}
              strokeWidth={1.8}
            />

            {unreadCount > 0 && (
              <span
                aria-label={`${unreadCount} notificações não lidas`}
                title={`${unreadCount} notificações não lidas`}
                style={{
                  position:
                    "absolute",
                  top: -2,
                  right: -3,
                  width: 8,
                  height: 8,
                  borderRadius:
                    "999px",
                  background:
                    "#d95d67",
                  boxShadow:
                    "0 0 0 2px var(--bg, #f7f7f5)",
                }}
              />
            )}
          </span>

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
