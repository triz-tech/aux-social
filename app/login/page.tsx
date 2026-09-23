"use client";

import Link from "next/link";
import {
  Suspense,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { IS_DEMO } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

function Form() {
  const router =
    useRouter();

  const params =
    useSearchParams();

  const [email, setEmail] =
    useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [mode, setMode] =
    useState<
      "login" | "signup"
    >(
      params.get("signup") ===
        "1"
        ? "signup"
        : "login"
    );

  const [msg, setMsg] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const resetSuccess =
    params.get("reset") ===
    "success";

  function hardNavigate(
    path: string
  ) {
    /*
     * Depois que o Supabase grava a sessão no browser,
     * fazemos uma navegação completa.
     *
     * Isso força o RootLayout server-side a executar de
     * novo com os cookies recém-atualizados, evitando que
     * AppNavigation/BottomNavigation continuem com
     * signedIn=false ou username=null do layout anterior.
     */
    window.location.assign(
      path
    );
  }

  async function submit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (IS_DEMO) {
      router.push(
        params.get("next") ||
          "/"
      );
      return;
    }

    setBusy(true);
    setMsg("");

    try {
      const supabase =
        createClient();

      if (
        mode === "signup"
      ) {
        const callbackUrl =
          `${window.location.origin}/auth/callback?next=/onboarding`;

        const {
          data,
          error,
        } =
          await supabase.auth
            .signUp({
              email,
              password,
              options: {
                emailRedirectTo:
                  callbackUrl,
              },
            });

        if (error) {
          throw error;
        }

        if (!data.session) {
          setMsg(
            "Conta criada. Confira seu email para continuar."
          );
          return;
        }

        hardNavigate(
          "/onboarding"
        );

        return;
      }

      const {
        data:
          signInData,
        error,
      } =
        await supabase.auth
          .signInWithPassword({
            email,
            password,
          });

      if (error) {
        throw error;
      }

      const {
        data: profile,
      } =
        await supabase
          .from("profiles")
          .select(
            "onboarding_completed"
          )
          .eq(
            "id",
            signInData.user.id
          )
          .maybeSingle();

      /*
       * Conta existe, mas a pessoa ainda
       * não terminou de montar o perfil.
       */
      if (
        !profile
          ?.onboarding_completed
      ) {
        hardNavigate(
          "/onboarding"
        );
        return;
      }

      const requestedNext =
        params.get("next");

      const next =
        requestedNext?.startsWith(
          "/"
        )
          ? requestedNext
          : "/";

      hardNavigate(next);
    } catch (error) {
      setMsg(
        error instanceof Error
          ? error.message
          : "Não consegui entrar."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <form
        className="authCard"
        onSubmit={submit}
      >
        <div className="brand">
          aux.
        </div>

        <h1>
          {mode === "login"
            ? "bem-vinda de volta."
            : "começa com uma música."}
        </h1>

        <p>
          {mode === "login"
            ? "entre para publicar, curtir e guardar memórias."
            : "crie sua conta em poucos passos."}
        </p>

        <div className="stack">
          {resetSuccess && (
            <div className="success">
              senha alterada. já
              pode entrar.
            </div>
          )}

          <input
            className="field"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(
              event
            ) =>
              setEmail(
                event.target
                  .value
              )
            }
            placeholder="email"
          />

          <input
            className="field"
            type="password"
            minLength={8}
            autoComplete={
              mode === "login"
                ? "current-password"
                : "new-password"
            }
            required
            value={password}
            onChange={(
              event
            ) =>
              setPassword(
                event.target
                  .value
              )
            }
            placeholder="senha"
          />

          {msg && (
            <div
              className={
                msg.startsWith(
                  "Conta"
                )
                  ? "success"
                  : "error"
              }
            >
              {msg}
            </div>
          )}

          <button
            className="primary"
            disabled={busy}
          >
            {busy
              ? "só um segundo…"
              : mode ===
                  "login"
                ? "Entrar"
                : "Criar conta"}
          </button>

          {mode ===
            "login" && (
            <Link
              href="/forgot-password"
              style={{
                display:
                  "block",
                textAlign:
                  "center",
                fontSize: 13,
                color:
                  "var(--muted)",
                textDecoration:
                  "none",
                padding:
                  "4px 0 8px",
              }}
            >
              esqueci minha
              senha
            </Link>
          )}

          <button
            type="button"
            className="secondary"
            onClick={() => {
              setMsg("");

              setMode(
                mode === "login"
                  ? "signup"
                  : "login"
              );
            }}
          >
            {mode === "login"
              ? "Criar uma conta"
              : "Já tenho conta"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  );
}
