"use client";

import {
  useEffect,
  useState,
} from "react";

import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";

import AvatarCropper from "@/components/profile/AvatarCropper";
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
    avatarPreview,
    setAvatarPreview,
  ] = useState<string | null>(
    null
  );

  const [
    avatarToCrop,
    setAvatarToCrop,
  ] = useState<string | null>(
    null
  );

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
   * ESCOLHER E RECORTAR AVATAR
   * =============================================
   */

  function chooseAvatar(
    file: File | undefined
  ) {
    if (!file) return;

    setError("");

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "escolha uma imagem."
      );
      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      setError(
        "a imagem precisa ter até 5 MB."
      );
      return;
    }

    if (avatarToCrop) {
      URL.revokeObjectURL(
        avatarToCrop
      );
    }

    setAvatarToCrop(
      URL.createObjectURL(file)
    );
  }

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
    <main className="shell authPage onboardingPage">
      {avatarToCrop && (
        <AvatarCropper
          image={avatarToCrop}
          onCancel={() => {
            URL.revokeObjectURL(
              avatarToCrop
            );

            setAvatarToCrop(null);
          }}
          onSave={(
            file,
            preview
          ) => {
            if (avatarPreview) {
              URL.revokeObjectURL(
                avatarPreview
              );
            }

            URL.revokeObjectURL(
              avatarToCrop
            );

            setAvatar(file);
            setAvatarPreview(
              preview
            );
            setAvatarToCrop(null);
          }}
        />
      )}

      <div className="authCard authCardAUX onboardingCard">
        <div className="onboardingTop">
          <div className="brand">
            aux.
          </div>

          <span className="onboardingStep">
            seu perfil
          </span>
        </div>

        <div className="authIntro onboardingIntro">
          <h1>
            quem tá no AUX?
          </h1>

          <p>
            seu perfil é seu gosto
            musical. o resto você
            completa depois.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            justifyItems: "center",
            gap: 8,
            margin:
              "4px 0 30px",
          }}
        >
          <label
            htmlFor="onboarding-avatar"
            aria-label={
              avatarPreview
                ? "Trocar foto de perfil"
                : "Adicionar foto de perfil"
            }
            style={{
              width: 112,
              height: 112,
              borderRadius: "50%",
              overflow: "hidden",
              position: "relative",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              background:
                "var(--soft)",
              border:
                "1px solid var(--line)",
            }}
          >
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Prévia da sua foto de perfil"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit:
                    "cover",
                }}
              />
            ) : (
              <Camera
                size={30}
                strokeWidth={1.6}
                style={{
                  opacity: 0.5,
                }}
              />
            )}

            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                right: 4,
                bottom: 4,
                width: 32,
                height: 32,
                borderRadius:
                  "50%",
                display: "grid",
                placeItems:
                  "center",
                background:
                  "var(--surface-solid, #fff)",
                border:
                  "1px solid var(--line)",
              }}
            >
              <Camera
                size={15}
                strokeWidth={1.8}
              />
            </span>

            <input
              id="onboarding-avatar"
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                chooseAvatar(
                  event.target
                    .files?.[0]
                );

                event.target.value =
                  "";
              }}
            />
          </label>

          <label
            htmlFor="onboarding-avatar"
            style={{
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {avatarPreview
              ? "trocar foto"
              : "adicionar foto"}
          </label>

          <span
            className="subtle"
            style={{
              fontSize: 12,
              textAlign: "center",
            }}
          >
            opcional · você pode
            trocar depois
          </span>
        </div>

        <div className="stack onboardingStack">
          <label className="authFieldGroup">
            <span className="authLabel">
              nome
            </span>

            <input
              className="field"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              maxLength={60}
              autoComplete="name"
              placeholder="seu nome"
            />
          </label>

          <label className="authFieldGroup">
            <span className="authLabel">
              username
            </span>

            <input
              className="field"
              value={username}
              onChange={(event) => {
                setError("");

                setUsername(
                  cleanUsername(
                    event.target.value
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
                className="usernameStatus"
                aria-live="polite"
              >
                {usernameStatus ===
                  "checking" && (
                  <span className="subtle">
                    conferindo @{handle}...
                  </span>
                )}

                {usernameStatus ===
                  "available" && (
                  <span className="usernameAvailable">
                    @{handle} está disponível
                  </span>
                )}

                {usernameStatus ===
                  "taken" && (
                  <span className="usernameTaken">
                    @{handle} já está em uso
                  </span>
                )}

                {usernameStatus ===
                  "invalid" && (
                  <span className="subtle">
                    use pelo menos 3 caracteres
                  </span>
                )}
              </div>
            )}
          </label>

          <label className="authFieldGroup">
            <span className="authLabel">
              bio
              <small>
                {" "}· opcional
              </small>
            </span>

            <textarea
              className="field onboardingBio"
              value={bio}
              onChange={(event) =>
                setBio(
                  event.target.value
                )
              }
              maxLength={180}
              placeholder="alguma coisa sobre você."
            />

            <span className="onboardingCount">
              {bio.length}/180
            </span>
          </label>

          {error && (
            <div
              className="error onboardingError"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="button"
            className="primary onboardingPrimary"
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
