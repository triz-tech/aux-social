"use client";

import Link from "next/link";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function sendReset(event: React.FormEvent) {
    event.preventDefault();

    const cleanEmail = email.trim();

    if (!cleanEmail) return;

    setBusy(true);
    setError("");

    try {
      const supabase = createClient();

      const redirectTo =
        `${window.location.origin}` +
        `/auth/callback?next=/reset-password`;

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo,
          }
        );

      if (error) throw error;

      /*
       * Importante:
       * não dizemos se o e-mail existe ou não.
       */
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não consegui enviar o e-mail."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <form
        className="authCard"
        onSubmit={sendReset}
      >
        <div className="brand">
          aux.
        </div>

        {!sent ? (
          <>
            <h1>
              esqueceu a senha?
            </h1>

            <p>
              coloca seu e-mail e a gente
              te manda um link para criar
              outra.
            </p>

            <div className="stack">
              <input
                className="field"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="email"
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
                  ? "enviando..."
                  : "enviar link"}
              </button>

              <Link
                href="/login"
                className="secondary"
                style={{
                  textAlign: "center",
                  textDecoration: "none",
                }}
              >
                voltar para entrar
              </Link>
            </div>
          </>
        ) : (
          <>
            <h1>
              olha seu e-mail.
            </h1>

            <p>
              se existir uma conta com esse
              endereço, enviamos um link para
              redefinir sua senha.
            </p>

            <Link
              href="/login"
              className="secondary"
              style={{
                display: "block",
                textAlign: "center",
                textDecoration: "none",
                marginTop: 22,
              }}
            >
              voltar
            </Link>
          </>
        )}
      </form>
    </main>
  );
}