"use client";

import {
  Camera,
  LogOut,
  Save,
} from "lucide-react";

import Image from "next/image";

import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { IS_DEMO } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

type UsernameStatus =
  | "idle"
  | "checking"
  | "current"
  | "available"
  | "taken"
  | "invalid";

function normalizeUsername(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 24);
}

export default function Settings() {
  const router = useRouter();

  const [name, setName] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [
    originalUsername,
    setOriginalUsername,
  ] = useState("");

  const [
    currentUserId,
    setCurrentUserId,
  ] = useState("");

  const [
    usernameStatus,
    setUsernameStatus,
  ] =
    useState<UsernameStatus>(
      "idle"
    );

  const [bio, setBio] =
    useState("");

  const [
    avatarUrl,
    setAvatarUrl,
  ] =
    useState<string | null>(
      null
    );

  const [
    newAvatar,
    setNewAvatar,
  ] =
    useState<File | null>(
      null
    );

  const [
    avatarPreview,
    setAvatarPreview,
  ] =
    useState<string | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [msg, setMsg] =
    useState("");

  const [error, setError] =
    useState("");

  /*
   * =====================================================
   * CARREGAR PERFIL
   * =====================================================
   */

  useEffect(() => {
    if (IS_DEMO) {
      setName("bia");
      setUsername("bia");
      setOriginalUsername(
        "bia"
      );

      setBio(
        "música, memória e opiniões excessivamente específicas."
      );

      setLoading(false);

      return;
    }

    void loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        router.push(
          "/login?next=/settings"
        );

        return;
      }

      setCurrentUserId(
        user.id
      );

      const {
        data,
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .select(
            `
              display_name,
              username,
              bio,
              avatar_url
            `
          )
          .eq(
            "id",
            user.id
          )
          .single();

      if (profileError) {
        throw new Error(
          profileError.message
        );
      }

      const loadedUsername =
        normalizeUsername(
          data.username ?? ""
        );

      setName(
        data.display_name ?? ""
      );

      setUsername(
        loadedUsername
      );

      setOriginalUsername(
        loadedUsername
      );

      setBio(
        data.bio ?? ""
      );

      setAvatarUrl(
        data.avatar_url ??
          null
      );

      setUsernameStatus(
        "current"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não consegui carregar seu perfil."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * =====================================================
   * VERIFICAR USERNAME ENQUANTO DIGITA
   * =====================================================
   */

  useEffect(() => {
    if (loading) {
      return;
    }

    const handle =
      normalizeUsername(
        username
      );

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
     * Se é o username atual da própria
     * pessoa, não precisamos consultar
     * o banco.
     */

    if (
      handle ===
      originalUsername
    ) {
      setUsernameStatus(
        "current"
      );

      return;
    }

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
              data,
              error:
                checkError,
            } =
              await supabase
                .from("profiles")
                .select("id")
                .eq(
                  "username",
                  handle
                )
                .maybeSingle();

            if (checkError) {
              throw checkError;
            }

            if (
              data &&
              data.id !==
                currentUserId
            ) {
              setUsernameStatus(
                "taken"
              );
            } else {
              setUsernameStatus(
                "available"
              );
            }
          } catch {
            /*
             * Se a verificação visual
             * falhar, o banco continua
             * sendo a proteção final.
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
  }, [
    username,
    originalUsername,
    currentUserId,
    loading,
  ]);

  /*
   * =====================================================
   * ESCOLHER NOVO AVATAR
   * =====================================================
   */

  function chooseAvatar(
    file: File | undefined
  ) {
    if (!file) return;

    setError("");
    setMsg("");

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Escolha uma imagem."
      );

      return;
    }

    if (
      file.size >
      5_000_000
    ) {
      setError(
        "A foto pode ter no máximo 5 MB."
      );

      return;
    }

    setNewAvatar(file);

    if (avatarPreview) {
      URL.revokeObjectURL(
        avatarPreview
      );
    }

    setAvatarPreview(
      URL.createObjectURL(
        file
      )
    );
  }

  /*
   * =====================================================
   * SALVAR PERFIL
   * =====================================================
   */

  async function save() {
    if (saving) {
      return;
    }

    setError("");
    setMsg("");

    const cleanName =
      name.trim();

    const cleanUsername =
      normalizeUsername(
        username
      );

    if (!cleanName) {
      setError(
        "Digite seu nome."
      );

      return;
    }

    if (
      cleanUsername.length <
      3
    ) {
      setError(
        "Seu @ precisa ter pelo menos 3 caracteres."
      );

      return;
    }

    if (
      usernameStatus ===
      "taken"
    ) {
      setError(
        `@${cleanUsername} já está em uso.`
      );

      return;
    }

    if (
      usernameStatus ===
      "checking"
    ) {
      setError(
        "Só um segundo, estou conferindo esse @."
      );

      return;
    }

    if (IS_DEMO) {
      setMsg(
        "salvo no modo demo."
      );

      return;
    }

    setSaving(true);

    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Entre novamente."
        );
      }

      /*
       * Confere novamente imediatamente
       * antes de salvar.
       */

      if (
        cleanUsername !==
        originalUsername
      ) {
        const {
          data: existing,
          error:
            checkError,
        } =
          await supabase
            .from("profiles")
            .select("id")
            .eq(
              "username",
              cleanUsername
            )
            .neq(
              "id",
              user.id
            )
            .maybeSingle();

        if (checkError) {
          throw new Error(
            checkError.message
          );
        }

        if (existing) {
          setUsernameStatus(
            "taken"
          );

          throw new Error(
            `@${cleanUsername} já está em uso.`
          );
        }
      }

      let nextAvatarUrl =
        avatarUrl;

      /*
       * NOVA FOTO
       */

      if (newAvatar) {
        const extension =
          (
            newAvatar.name
              .split(".")
              .pop() ||
            "jpg"
          ).replace(
            /[^a-z0-9]/gi,
            ""
          );

        const path =
          `${user.id}/` +
          `${crypto.randomUUID()}.` +
          `${extension}`;

        const {
          error:
            uploadError,
        } =
          await supabase.storage
            .from("avatars")
            .upload(
              path,
              newAvatar,
              {
                contentType:
                  newAvatar.type,

                upsert: false,
              }
            );

        if (uploadError) {
          throw new Error(
            uploadError.message
          );
        }

        nextAvatarUrl =
          supabase.storage
            .from("avatars")
            .getPublicUrl(
              path
            ).data
            .publicUrl;
      }

      /*
       * ATUALIZAR PERFIL
       */

      const {
        error:
          profileError,
      } =
        await supabase
          .from("profiles")
          .update({
            display_name:
              cleanName,

            username:
              cleanUsername,

            bio:
              bio.trim() ||
              null,

            avatar_url:
              nextAvatarUrl,
          })
          .eq(
            "id",
            user.id
          );

      if (profileError) {
        /*
         * PostgreSQL 23505:
         * username duplicado.
         *
         * Esta é a proteção final caso
         * duas pessoas tentem escolher
         * o mesmo @ simultaneamente.
         */

        if (
          profileError.code ===
          "23505"
        ) {
          setUsernameStatus(
            "taken"
          );

          throw new Error(
            `@${cleanUsername} já está em uso.`
          );
        }

        throw new Error(
          profileError.message
        );
      }

      setUsername(
        cleanUsername
      );

      setOriginalUsername(
        cleanUsername
      );

      setUsernameStatus(
        "current"
      );

      setAvatarUrl(
        nextAvatarUrl
      );

      setNewAvatar(null);
      setAvatarPreview(null);

      setMsg(
        "perfil salvo."
      );

      setTimeout(() => {
        router.push(
          `/u/${cleanUsername}`
        );

        router.refresh();
      }, 500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não consegui salvar."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * =====================================================
   * LOGOUT
   * =====================================================
   */

  async function logout() {
    if (!IS_DEMO) {
      await createClient()
        .auth.signOut();
    }

    router.push("/");
    router.refresh();
  }

  /*
   * =====================================================
   * LOADING
   * =====================================================
   */

  if (loading) {
    return (
      <main className="shell">
        <p className="subtle">
          carregando seu perfil...
        </p>
      </main>
    );
  }

  /*
   * =====================================================
   * UI
   * =====================================================
   */

  const currentAvatar =
    avatarPreview ??
    avatarUrl;

  const handle =
    normalizeUsername(
      username
    );

  const usernameBlocked =
    usernameStatus ===
      "taken" ||
    usernameStatus ===
      "checking" ||
    usernameStatus ===
      "invalid";

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          aux.
        </div>

        <span className="pill">
          editar perfil
        </span>
      </header>

      <h1 className="pageTitle">
        seu perfil.
      </h1>

      <div
        className="stack"
        style={{
          maxWidth: 520,
        }}
      >
        {/* AVATAR */}

        <div
          style={{
            display: "grid",
            placeItems:
              "center",
            gap: 12,
            padding:
              "8px 0 18px",
          }}
        >
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius:
                "50%",
              overflow:
                "hidden",
              background:
                "#e8e8e8",
              position:
                "relative",
            }}
          >
            {currentAvatar && (
              <Image
                src={
                  currentAvatar
                }
                alt="Sua foto de perfil"
                fill
                unoptimized
                style={{
                  objectFit:
                    "cover",
                }}
              />
            )}
          </div>

          <label
            className="secondary"
            style={{
              display:
                "inline-flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              gap: 8,
              cursor:
                "pointer",
            }}
          >
            <Camera
              size={17}
            />

            {currentAvatar
              ? "trocar foto"
              : "adicionar foto"}

            <input
              hidden
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              onChange={(
                event
              ) =>
                chooseAvatar(
                  event
                    .target
                    .files?.[0]
                )
              }
            />
          </label>
        </div>

        {/* NOME */}

        <label>
          <span className="subtle">
            nome
          </span>

          <input
            className="field"
            value={name}
            onChange={(
              event
            ) =>
              setName(
                event.target
                  .value
              )
            }
            maxLength={60}
            placeholder="seu nome"
          />
        </label>

        {/* USERNAME */}

        <label>
          <span className="subtle">
            username
          </span>

          <input
            className="field"
            value={username}
            onChange={(
              event
            ) => {
              setError("");
              setMsg("");

              setUsername(
                normalizeUsername(
                  event.target
                    .value
                )
              );
            }}
            maxLength={24}
            placeholder="@username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />

          {handle && (
            <div
              style={{
                minHeight: 24,
                padding:
                  "7px 4px 0",
                fontSize: 12,
              }}
            >
              {usernameStatus ===
                "checking" && (
                <span className="subtle">
                  conferindo
                  {" "}
                  @{handle}...
                </span>
              )}

              {usernameStatus ===
                "current" && (
                <span className="subtle">
                  seu @ atual
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
                <span
                  style={{
                    color:
                      "#b42318",
                  }}
                >
                  use pelo menos
                  3 caracteres
                </span>
              )}
            </div>
          )}
        </label>

        {/* BIO */}

        <label>
          <span className="subtle">
            bio
          </span>

          <textarea
            className="field"
            value={bio}
            onChange={(
              event
            ) =>
              setBio(
                event.target
                  .value
              )
            }
            maxLength={180}
            placeholder="alguma coisa sobre você."
          />

          <div
            className="subtle"
            style={{
              textAlign:
                "right",
              fontSize: 12,
              marginTop: 5,
            }}
          >
            {bio.length}/180
          </div>
        </label>

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {msg && (
          <div className="success">
            {msg}
          </div>
        )}

        <button
          className="primary"
          onClick={() =>
            void save()
          }
          disabled={
            saving ||
            usernameBlocked
          }
        >
          <Save size={17} />

          {saving
            ? "salvando..."
            : usernameStatus ===
                "checking"
              ? "conferindo @..."
              : "salvar alterações"}
        </button>

        <button
          className="secondary"
          onClick={() =>
            router.back()
          }
        >
          cancelar
        </button>

        <div
          style={{
            height: 20,
          }}
        />

        <button
          className="secondary"
          onClick={() =>
            void logout()
          }
          style={{
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            gap: 8,
          }}
        >
          <LogOut size={17} />
          sair da conta
        </button>
      </div>
    </main>
  );
}