"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] =
    useState("");

  const [confirm, setConfirm] =
    useState("");

  const [checking, setChecking] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * O callback deve ter criado uma sessão
   * de recovery antes de chegar aqui.
   */

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        router.replace(
          "/forgot-password"
        );

        return;
      }

      setChecking(false);
    }

    void checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  async function updatePassword(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");

    if (password.length < 8) {
      setError(
        "Use pelo menos 8 caracteres."
      );

      return;
    }

    if (password !== confirm) {
      setError(
        "As senhas não são iguais."
      );

      return;
    }

    setBusy(true);

    try {
      const supabase =
        createClient();

      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) throw error;

      /*
       * Após trocar a senha,
       * encerramos a sessão de recovery.
       */

      await supabase.auth.signOut();

      router.replace(
        "/login?reset=success"
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não consegui alterar a senha."
      );
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <main className="shell">
        <div className="authCard">
          <div className="brand">
            aux.
          </div>

          <p>
            conferindo seu link...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <form
        className="authCard"
        onSubmit={updatePassword}
      >
        <div className="brand">
          aux.
        </div>

        <h1>
          nova senha.
        </h1>

        <p>
          escolhe uma que você vai
          lembrar dessa vez.
        </p>

        <div className="stack">
          <input
            className="field"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            placeholder="nova senha"
          />

          <input
            className="field"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirm}
            onChange={(event) =>
              setConfirm(
                event.target.value
              )
            }
            placeholder="repita a senha"
          />

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <button
            className="primary"
            disabled={busy}
          >
            {busy
              ? "salvando..."
              : "salvar nova senha"}
          </button>
        </div>
      </form>
    </main>
  );
}