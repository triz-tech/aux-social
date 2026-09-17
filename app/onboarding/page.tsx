"use client";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { IS_DEMO } from "@/lib/config";

type UsernameStatus =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid";

function cleanUsername(
  value: string
) {
  return value
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 24);
}

export default function Onboarding() {
  const router = useRouter();

  const [name, setName] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [bio, setBio] =
    useState("");

  const [avatar, setAvatar] =
    useState<File | null>(null);

  const [
    usernameStatus,
    setUsernameStatus,
  ] =
    useState<UsernameStatus>(
      "idle"
    );

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  /*
   * =============================================
   * VERIFICAR @
   * =============================================
   */

  useEffect(() => {
    const handle =
      cleanUsername(username);

    if (!handle) {
      setUsernameStatus(
        "idle"
      );
      return;
    }

    if (handle.length < 3) {
      setUsernameStatus(
        "invalid"
      );
      return;
    }

    /*
     * Espera um pouquinho depois
     * da pessoa parar de digitar.
     */
    const timer =
      window.setTimeout(
        async () => {
          if (IS_DEMO) {
            setUsernameStatus(
              "available"
            );
            return;
          }

          setUsernameStatus(
            "checking"
          );

          try {
            const supabase =
              createClient();

            const {
              data: { user },
            } =
              await supabase.auth.getUser();

            if (!user) {
              setUsernameStatus(
                "idle"
              );
              return;
            }

            const {
              data,
              error,
            } =
              await supabase
                .from("profiles")
                .select("id")
                .eq(
                  "username",
                  handle
                )
                .neq(
                  "id",
                  user.id
                )
                .maybeSingle();

            if (error) {
              throw error;
            }

            setUsernameStatus(
              data
                ? "taken"
                : "available"
            );
          } catch {
            /*
             * Mesmo se essa checagem
             * visual falhar, o banco
             * ainda bloqueia duplicados.
             */
            setUsernameStatus(
              "idle"
            );
          }
        },
        450
      );

    return () => {
      window.clearTimeout(
        timer
      );
    };
  }, [username]);

  /*
   * =============================================
   * SALVAR PERFIL
   * =============================================
   */

  async function save() {
    if (saving) return;

    const handle =
      cleanUsername(username);

    if (!name.trim()) {
      setError(
        "coloca seu nome."
      );
      return;
    }

    if (handle.length < 3) {
      setError(
        "seu @ precisa ter pelo menos 3 caracteres."
      );
      return;
    }

    if (
      usernameStatus ===
      "checking"
    ) {
      setError(
        "só um segundo, estou conferindo esse @."
      );
      return;
    }

    if (
      usernameStatus ===
      "taken"
    ) {
      setError(
        `@${handle} já está em uso.`
      );
      return;
    }

    if (IS_DEMO) {
      router.push(
        "/u/demo"
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        router.push(
          "/login"
        );
        return;
      }

      /*
       * Confere novamente imediatamente
       * antes de salvar.
       */

      const {
        data: existing,
        error:
          usernameCheckError,
      } =
        await supabase
          .from("profiles")
          .select("id")
          .eq(
            "username",
            handle
          )
          .neq(
            "id",
            user.id
          )
          .maybeSingle();

      if (
        usernameCheckError
      ) {
        throw usernameCheckError;
      }

      if (existing) {
        setUsernameStatus(
          "taken"
        );

        setError(
          `@${handle} já está em uso.`
        );

        return;
      }

      /*
       * Avatar
       */

      let avatar_url:
        | string
        | null = null;

      if (avatar) {
        if (
          !avatar.type.startsWith(
            "image/"
          )
        ) {
          throw new Error(
            "escolha uma imagem para o avatar."
          );
        }

        if (
          avatar.size >
          5 * 1024 * 1024
        ) {
          throw new Error(
            "a imagem precisa ter até 5 MB."
          );
        }

        const ext =
          avatar.name
            .split(".")
            .pop() || "jpg";

        const path =
          `${user.id}/` +
          `${crypto.randomUUID()}.${ext}`;

        const {
          error:
            uploadError,
        } =
          await supabase.storage
            .from("avatars")
            .upload(
              path,
              avatar,
              {
                contentType:
                  avatar.type,
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        avatar_url =
          supabase.storage
            .from("avatars")
            .getPublicUrl(
              path
            ).data.publicUrl;
      }

      /*
       * Salvar perfil.
       */

      const {
        error: updateError,
      } =
        await supabase
          .from("profiles")
          .update({
            display_name:
              name.trim(),

            username:
              handle,

            bio:
              bio.trim() ||
              null,

            avatar_url,
            onboarding_completed: true,
          })
          .eq(
            "id",
            user.id
          );

      if (updateError) {
        /*
         * PostgreSQL 23505 =
         * violação de UNIQUE.
         *
         * Mesmo que duas pessoas tentem
         * pegar o mesmo @ exatamente
         * ao mesmo tempo, o banco decide.
         */
        if (
          updateError.code ===
          "23505"
        ) {
          setUsernameStatus(
            "taken"
          );

          throw new Error(
            `@${handle} já está em uso.`
          );
        }

        throw updateError;
      }

      router.push(
        `/u/${handle}`
      );

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não consegui salvar seu perfil."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * =============================================
   * UI
   * =============================================
   */

  const handle =
    cleanUsername(username);

  const canContinue =
    !!name.trim() &&
    handle.length >= 3 &&
    usernameStatus !==
      "taken" &&
    usernameStatus !==
      "checking" &&
    !saving;

  return (
    <main className="shell">
      <div className="authCard">
        <div className="brand">
          aux.
        </div>

        <h1>
          quem tá no AUX?
        </h1>

        <p>
          seu perfil é seu gosto
          musical. o resto você
          completa depois.
        </p>

        <div className="stack">
          <input
            className="field"
            value={name}
            onChange={(
              event
            ) =>
              setName(
                event.target.value
              )
            }
            maxLength={60}
            placeholder="nome"
          />

          <div>
            <input
              className="field"
              value={
                username
              }
              onChange={(
                event
              ) => {
                setError("");

                setUsername(
                  cleanUsername(
                    event.target
                      .value
                  )
                );
              }}
              maxLength={24}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="@username"
            />

            {handle && (
              <div
                style={{
                  padding:
                    "8px 4px 0",
                  fontSize: 12,
                }}
              >
                {usernameStatus ===
                  "checking" && (
                  <span className="subtle">
                    conferindo
                    @{handle}...
                  </span>
                )}

                {usernameStatus ===
                  "available" && (
                  <span
                    style={{
                      color:
                        "#39734d",
                    }}
                  >
                    @{handle} está
                    disponível
                  </span>
                )}

                {usernameStatus ===
                  "taken" && (
                  <span
                    style={{
                      color:
                        "#b42318",
                    }}
                  >
                    @{handle} já
                    está em uso
                  </span>
                )}

                {usernameStatus ===
                  "invalid" && (
                  <span className="subtle">
                    use pelo menos
                    3 caracteres
                  </span>
                )}
              </div>
            )}
          </div>

          <textarea
            className="field"
            value={bio}
            onChange={(
              event
            ) =>
              setBio(
                event.target.value
              )
            }
            maxLength={180}
            placeholder="bio opcional"
          />

          <label className="secondary">
            {avatar
              ? avatar.name
              : "escolher avatar"}

            <input
              hidden
              type="file"
              accept="image/*"
              onChange={(
                event
              ) =>
                setAvatar(
                  event.target
                    .files?.[0] ||
                    null
                )
              }
            />
          </label>

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <button
            className="primary"
            onClick={() =>
              void save()
            }
            disabled={
              !canContinue
            }
          >
            {saving
              ? "salvando..."
              : "continuar"}
          </button>
        </div>
      </div>
    </main>
  );
}