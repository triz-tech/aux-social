"use client";

import {
  Camera,
  LogOut,
  Save,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { IS_DEMO } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import TopFiveEditor from "@/components/profile/TopFiveEditor";
import AvatarCropper from "@/components/profile/AvatarCropper";

export default function Settings() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [username, setUsername] =
    useState("");
  const [bio, setBio] = useState("");

  const [
    emailUpdatesOptIn,
    setEmailUpdatesOptIn,
  ] = useState(false);

  const [
    emailUpdatesOptInAt,
    setEmailUpdatesOptInAt,
  ] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] =
    useState<string | null>(null);

  const [newAvatar, setNewAvatar] =
    useState<File | null>(null);

  const [avatarPreview, setAvatarPreview] =
    useState<string | null>(null);

  const [
  deleteAccountOpen,
  setDeleteAccountOpen,
] = useState(false);

const [
  deletingAccount,
  setDeletingAccount,
] = useState(false);



  const [avatarToCrop, setAvatarToCrop] =
  useState<string | null>(null);  

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [msg, setMsg] = useState("");
  const [error, setError] =
    useState("");

  const [userId, setUserId] =
    useState<string | null>(
      IS_DEMO ? "demo" : null
    );

  /*
   * =====================================================
   * CARREGAR PERFIL
   * =====================================================
   */

  useEffect(() => {
    if (IS_DEMO) {
      setName("bia");
      setUsername("bia");

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

      setUserId(user.id);

      const {
        data,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          `
            display_name,
            username,
            bio,
            avatar_url,
            email_updates_opt_in,
            email_updates_opt_in_at
          `
        )
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      setName(
        data.display_name ?? ""
      );

      setUsername(
        data.username ?? ""
      );

      setBio(
        data.bio ?? ""
      );

      setAvatarUrl(
        data.avatar_url ?? null
      );

      setEmailUpdatesOptIn(
        Boolean(
          data.email_updates_opt_in
        )
      );

      setEmailUpdatesOptInAt(
        data.email_updates_opt_in_at ??
          null
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
   * ESCOLHER NOVO AVATAR
   * =====================================================
   */

function chooseAvatar(
  file: File | undefined
) {
  if (!file) return;

  setError("");
  setMsg("");

  if (!file.type.startsWith("image/")) {
    setError("Escolha uma imagem.");
    return;
  }

  if (file.size > 5_000_000) {
    setError(
      "A foto pode ter no máximo 5 MB."
    );
    return;
  }

  if (avatarToCrop) {
    URL.revokeObjectURL(
      avatarToCrop
    );
  }

  const imageUrl =
    URL.createObjectURL(file);

  setAvatarToCrop(imageUrl);
}
  /*
   * =====================================================
   * SALVAR PERFIL
   * =====================================================
   */

  async function save() {
    setError("");
    setMsg("");

    const cleanName =
      name.trim();

    const cleanUsername =
      username
        .trim()
        .toLowerCase()
        .replace(
          /[^a-z0-9_.]/g,
          ""
        );

    if (!cleanName) {
      setError(
        "Digite seu nome."
      );

      return;
    }

    if (!cleanUsername) {
      setError(
        "Escolha um username."
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

      if (!userId) {
        throw new Error(
          "Entre novamente."
        );
      }

      let nextAvatarUrl =
        avatarUrl;

      /*
       * Se escolheu uma nova foto,
       * faz upload primeiro.
       */

      if (newAvatar) {
        const extension =
          (
            newAvatar.name
              .split(".")
              .pop() || "jpg"
          ).replace(
            /[^a-z0-9]/gi,
            ""
          );

        const path =
          `${userId}/` +
          `${crypto.randomUUID()}.` +
          `${extension}`;

        const {
          error: uploadError,
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
          throw uploadError;
        }

        nextAvatarUrl =
          supabase.storage
            .from("avatars")
            .getPublicUrl(
              path
            ).data.publicUrl;
      }

      /*
       * Atualiza o profile.
       */

      const nextEmailUpdatesOptInAt =
        emailUpdatesOptIn
          ? emailUpdatesOptInAt ??
            new Date().toISOString()
          : null;

      const {
        error: profileError,
      } = await supabase
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

          email_updates_opt_in:
            emailUpdatesOptIn,

          email_updates_opt_in_at:
            nextEmailUpdatesOptInAt,
        })
        .eq("id", userId);

      if (profileError) {
        throw profileError;
      }

      setAvatarUrl(
        nextAvatarUrl
      );

      setNewAvatar(null);
      setAvatarPreview(null);

      setEmailUpdatesOptInAt(
        nextEmailUpdatesOptInAt
      );

      setMsg("perfil salvo.");

      /*
       * Se o username mudou,
       * manda para a URL nova.
       */

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

    router.push("/login");
    router.refresh();
  }

  async function deleteAccount() {
    setDeletingAccount(true);
    setError("");

    try {
      const response = await fetch(
        "/api/account/delete",
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não consegui excluir sua conta."
        );
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não consegui excluir sua conta."
      );

      setDeleteAccountOpen(false);
    } finally {
      setDeletingAccount(false);
    }
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

  return (
    <main className="shell settingsPage">
      {deleteAccountOpen && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "rgba(0,0,0,.55)",
      display: "grid",
      placeItems: "center",
      padding: 20,
    }}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 390,
        background: "var(--bg)",
        border: "1px solid var(--line)",
        borderRadius: 24,
        padding: 24,
      }}
    >
      <span
        className="subtle"
        style={{
          display: "block",
          marginBottom: 8,
        }}
      >
        excluir conta
      </span>

      <h2
        style={{
          margin: "0 0 10px",
          fontSize: 24,
        }}
      >
        tem certeza?
      </h2>

      <p
        className="subtle"
        style={{
          lineHeight: 1.5,
          marginBottom: 22,
        }}
      >
        sua conta, perfil,
        publicações e dados do AUX
        serão excluídos
        permanentemente.
      </p>

      <div
        style={{
          display: "grid",
          gap: 10,
        }}
      >
        <button
          type="button"
          className="secondary"
          onClick={() =>
            setDeleteAccountOpen(false)
          }
          disabled={deletingAccount}
        >
          cancelar
        </button>

        <button
          type="button"
          className="secondary"
          onClick={() =>
            void deleteAccount()
          }
          disabled={deletingAccount}
          style={{
            color: "#b42318",
            borderColor:
              "rgba(180,35,24,.25)",
          }}
        >
          {deletingAccount
            ? "excluindo..."
            : "excluir permanentemente"}
        </button>
      </div>
    </div>
  </div>
)}

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

      setNewAvatar(file);
      setAvatarPreview(preview);
      setAvatarToCrop(null);
    }}
  />
)}
      <header className="topbar">
        <div className="brand">
          aux.
        </div>

        <span className="pill">
          editar perfil
        </span>
      </header>

      <div className="settingsContent">
        <h1 className="pageTitle">
          seu perfil.
        </h1>

        <div className="stack settingsForm">
        {/*
         * ------------------------
         * AVATAR
         * ------------------------
         */}

        <div
          style={{
            display: "grid",
            placeItems: "center",
            gap: 12,
            padding: "8px 0 18px",
          }}
        >
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: "50%",
              overflow: "hidden",
              background: "var(--soft)",
              position: "relative",
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
            <Camera size={17} />

            {currentAvatar
              ? "trocar foto"
              : "adicionar foto"}

<input
  hidden
  type="file"
  accept="image/jpeg,image/png,image/webp"
  onChange={(event) => {
    chooseAvatar(
      event.target.files?.[0]
    );

    event.target.value = "";
  }}
/>
          </label>
        </div>

        {/*
         * ------------------------
         * DADOS
         * ------------------------
         */}

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

        <label>
          <span className="subtle">
            username
          </span>

          <input
            className="field"
            value={username}
            onChange={(
              event
            ) =>
              setUsername(
                event.target
                  .value
              )
            }
            maxLength={24}
            placeholder="username"
            autoCapitalize="none"
            spellCheck={false}
          />
        </label>

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
              textAlign: "right",
              fontSize: 12,
              marginTop: 5,
            }}
          >
            {bio.length}/180
          </div>
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            padding: "14px 0 4px",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={
              emailUpdatesOptIn
            }
            onChange={(event) => {
              setEmailUpdatesOptIn(
                event.target.checked
              );

              if (
                !event.target.checked
              ) {
                setEmailUpdatesOptInAt(
                  null
                );
              }
            }}
            style={{
              width: 17,
              height: 17,
              marginTop: 2,
              accentColor:
                "var(--ink)",
              flexShrink: 0,
            }}
          />

          <span
            style={{
              display: "grid",
              gap: 3,
            }}
          >
            <strong
              style={{
                fontSize: 13,
                fontWeight: 650,
                lineHeight: 1.35,
              }}
            >
              quero receber novidades
              do AUX por e-mail
            </strong>

            <span
              className="subtle"
              style={{
                fontSize: 12,
                lineHeight: 1.45,
              }}
            >
              atualizações do site,
              novidades e convites
              para testar coisas novas.
              opcional.
            </span>
          </span>
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
          disabled={saving}
        >
          <Save size={17} />

          {saving
            ? "salvando..."
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

        <TopFiveEditor
  userId={userId}
/>

<div
  style={{
    marginTop: 32,
    paddingTop: 24,
    borderTop: "1px solid var(--line)",
  }}
>
  <span
    className="subtle"
    style={{
      display: "block",
      marginBottom: 10,
    }}
  >
    zona de perigo
  </span>

  <button
    type="button"
    className="secondary"
    onClick={() =>
      setDeleteAccountOpen(true)
    }
    style={{
      width: "100%",
      color: "#b42318",
    }}
  >
    excluir minha conta
  </button>
</div>

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
>
  <LogOut size={17} />
  sair da conta
</button>
        </div>
      </div>
    </main>
  );
}