"use client";

import {
  Check,
  Copy,
  ImageIcon,
  Pencil,
  Share2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
} from "react";

import type {
  Post,
  Profile,
} from "@/types";

import PostCard from "@/components/post/PostCard";
import { shareProfileStory } from "@/components/share/profileStory";

import { IS_DEMO } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

type Tab =
  | "All"
  | "Reviews"
  | "Memories"
  | "Reposts";

export default function ProfileView({
  profile,
  posts,
  social,
}: {
  profile: Profile;

  posts: Post[];

  social: {
    followers: number;
    following: number;
    viewerId: string | null;
    isFollowing: boolean;
  };
}) {
  const router = useRouter();

  const [tab, setTab] =
    useState<Tab>("All");

  const [shareOpen, setShareOpen] =
    useState(false);

  const [shareBusy, setShareBusy] =
    useState(false);

  const [shareMessage, setShareMessage] =
    useState("");

  const [follow, setFollow] =
    useState(
      social.isFollowing
    );

  const [followers, setFollowers] =
    useState(
      social.followers
    );

  const isMe =
    social.viewerId ===
    profile.id;

  /*
   * ======================================================
   * POSTS ORIGINAIS
   * ======================================================
   */

  const ownPosts =
    useMemo(
      () =>
        posts.filter(
          (post) =>
            !post.reposted_by
        ),
      [posts]
    );

  /*
   * ======================================================
   * EM ROTAÇÃO
   *
   * Só quatro capas.
   * Sem texto.
   * Sem métricas.
   * ======================================================
   */

  const rotation =
    useMemo(() => {
      const seen =
        new Set<string>();

      return ownPosts
        .filter(
          (post) =>
            !!post.track
              .artwork_url
        )
        .filter((post) => {
          if (
            seen.has(
              post.track.id
            )
          ) {
            return false;
          }

          seen.add(
            post.track.id
          );

          return true;
        })
        .slice(0, 4);
    }, [ownPosts]);

  /*
   * ======================================================
   * TABS
   * ======================================================
   */

  const shown =
    posts.filter(
      (post) => {
        if (tab === "All") {
          return true;
        }

        if (
          tab === "Reviews"
        ) {
          return (
            post.type ===
              "review" &&
            !post.reposted_by
          );
        }

        if (
          tab ===
          "Memories"
        ) {
          return (
            post.type ===
              "memory" &&
            !post.reposted_by
          );
        }

        if (
          tab === "Reposts"
        ) {
          return !!post.reposted_by;
        }

        return true;
      }
    );

  /*
   * ======================================================
   * SHARE
   * ======================================================
   */

  function profileUrl() {
    return `${location.origin}/u/${profile.username}`;
  }

  async function shareProfileCard() {
    setShareBusy(true);
    setShareMessage("");

    try {
      const result =
        await shareProfileStory(
          profile,
          rotation
        );

      if (result === "shared") {
        setShareMessage(
          "pronto para compartilhar."
        );
      } else {
        setShareMessage(
          "card do perfil salvo."
        );
      }
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      setShareMessage(
        error instanceof Error
          ? error.message
          : "não consegui criar o card."
      );
    } finally {
      setShareBusy(false);
    }
  }

  async function shareProfileLink() {
    const url = profileUrl();

    try {
      if (navigator.share) {
        await navigator.share({
          title:
            `@${profile.username} · aux.`,
          url,
        });

        return;
      }

      await navigator.clipboard.writeText(
        url
      );

      setShareMessage(
        "link do perfil copiado."
      );
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      setShareMessage(
        "não consegui compartilhar o link."
      );
    }
  }

  async function copyProfileLink() {
    try {
      await navigator.clipboard.writeText(
        profileUrl()
      );

      setShareMessage(
        "link do perfil copiado."
      );
    } catch {
      setShareMessage(
        "não consegui copiar o link."
      );
    }
  }

  /*
   * ======================================================
   * FOLLOW
   * ======================================================
   */

  async function toggleFollow() {
    const before =
      follow;

    setFollow(!before);

    setFollowers(
      (current) =>
        current +
        (before ? -1 : 1)
    );

    if (IS_DEMO) {
      return;
    }

    try {
      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        location.href =
          `/login?next=${encodeURIComponent(
            location.pathname
          )}`;

        return;
      }

      const query =
        supabase.from(
          "follows"
        );

      const { error } =
        before
          ? await query
              .delete()
              .eq(
                "follower_id",
                user.id
              )
              .eq(
                "following_id",
                profile.id
              )
          : await query.insert(
              {
                follower_id:
                  user.id,

                following_id:
                  profile.id,
              }
            );

      if (error) {
        throw error;
      }
    } catch {
      setFollow(before);

      setFollowers(
        (current) =>
          current +
          (before ? 1 : -1)
      );
    }
  }

  /*
   * ======================================================
   * UI
   * ======================================================
   */

  return (
    <main className="shell">
      {/*
       * --------------------------------------------------
       * HEADER
       * --------------------------------------------------
       */}

      <header className="topbar">
        <div className="brand">
          aux.
        </div>

        <div
          style={{
            display: "flex",
            alignItems:
              "center",
            gap: 8,
          }}
        >
          {isMe && (
            <button
              className="pill"
              aria-label="Editar perfil"
              title="Editar perfil"
              onClick={() =>
                router.push(
                  "/settings"
                )
              }
              style={{
                width: 42,
                height: 42,
                padding: 0,
                display:
                  "grid",
                placeItems:
                  "center",
              }}
            >
              <Pencil
                size={16}
              />
            </button>
          )}

          <button
            className="pill"
            aria-label="Compartilhar perfil"
            title="Compartilhar perfil"
            onClick={() => {
              setShareMessage("");
              setShareOpen(true);
            }}
            style={{
              width: 42,
              height: 42,
              padding: 0,
              display:
                "grid",
              placeItems:
                "center",
            }}
          >
            <Share2
              size={16}
            />
          </button>
        </div>
      </header>

      {/*
       * --------------------------------------------------
       * PERFIL
       * --------------------------------------------------
       */}

      <section
        style={{
          display: "flex",
          flexDirection:
            "column",
          alignItems:
            "center",
          textAlign: "center",

          padding:
            "24px 0 10px",
        }}
      >
        {/*
         * AVATAR GRANDE
         */}

        <div
          style={{
            width: 96,
            height: 96,

            borderRadius:
              "50%",

            overflow:
              "hidden",

            background:
              "#eeeeec",

            display:
              "grid",

            placeItems:
              "center",

            boxShadow:
              "0 0 0 1px rgba(0,0,0,.04)",

            marginBottom: 18,
          }}
        >
          {profile.avatar_url ? (
            <img
              src={
                profile.avatar_url
              }
              alt={
                profile.display_name
              }
              style={{
                width:
                  "100%",

                height:
                  "100%",

                display:
                  "block",

                objectFit:
                  "cover",
              }}
            />
          ) : (
            <span
              style={{
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              {profile.display_name
                ?.charAt(0)
                .toUpperCase()}
            </span>
          )}
        </div>

        {/*
         * NOME
         */}

        <h1
          style={{
            margin: 0,

            fontSize: 30,

            lineHeight: 1.05,

            letterSpacing:
              "-0.045em",
          }}
        >
          {
            profile.display_name
          }
        </h1>

        {/*
         * USERNAME
         */}

        <div
          className="subtle"
          style={{
            marginTop: 6,
            fontSize: 14,
          }}
        >
          @{profile.username}
        </div>

        {/*
         * BIO
         */}

        {profile.bio && (
          <p
            style={{
              margin:
                "18px 0 0",

              maxWidth: 310,

              fontSize: 15,

              lineHeight: 1.45,
            }}
          >
            {profile.bio}
          </p>
        )}

        {/*
         * SOCIAL
         */}

        <div
          style={{
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",

            gap: 6,

            marginTop: 15,

            fontSize: 12.5,
          }}
        >
          <strong>
            {followers}
          </strong>

          <span className="subtle">
            {followers === 1
              ? "seguidor"
              : "seguidores"}
          </span>

          <span
            className="subtle"
            style={{
              margin:
                "0 3px",
            }}
          >
            ·
          </span>

          <strong>
            {social.following}
          </strong>

          <span className="subtle">
            seguindo
          </span>
        </div>

        {/*
         * FOLLOW
         */}

        {!isMe && (
          <button
            className={
              follow
                ? "secondary"
                : "primary"
            }
            onClick={() =>
              void toggleFollow()
            }
            style={{
              width: "auto",
              minWidth: 132,

              marginTop: 18,

              padding:
                "10px 22px",
            }}
          >
            {follow
              ? "seguindo"
              : "seguir"}
          </button>
        )}
      </section>

      {/*
       * --------------------------------------------------
       * MÚSICA
       * --------------------------------------------------
       */}

      {rotation.length >
        0 && (
        <section
          style={{
            marginTop: 32,
          }}
        >
          <div
            style={{
              marginBottom: 12,

              fontSize: 14,

              fontWeight: 700,

              letterSpacing:
                "-0.02em",
            }}
          >
            em rotação
          </div>

          <div
            style={{
              display: "grid",

              gridTemplateColumns:
                `repeat(${Math.min(
                  rotation.length,
                  4
                )}, 1fr)`,

              gap: 8,
            }}
          >
            {rotation.map(
              (post) => (
                <div
                  key={
                    post.track.id
                  }
                  title={`${post.track.title} — ${post.track.artist}`}
                  style={{
                    position:
                      "relative",

                    width:
                      "100%",

                    aspectRatio:
                      "1 / 1",

                    borderRadius:
                      16,

                    overflow:
                      "hidden",

                    background:
                      "#ececea",

                    boxShadow:
                      "0 1px 2px rgba(0,0,0,.04)",
                  }}
                >
                  <img
                    src={
                      post.track
                        .artwork_url!
                    }
                    alt={`Capa de ${post.track.title}`}
                    style={{
                      width:
                        "100%",

                      height:
                        "100%",

                      display:
                        "block",

                      objectFit:
                        "cover",
                    }}
                  />
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/*
       * --------------------------------------------------
       * TABS
       * --------------------------------------------------
       */}

      <div
        style={{
          height: 28,
        }}
      />

      <div className="tabs">
        {(
          [
            "All",
            "Reviews",
            "Memories",
            "Reposts",
          ] as Tab[]
        ).map((item) => (
          <button
            key={item}
            onClick={() =>
              setTab(item)
            }
            className={`tab ${
              tab === item
                ? "active"
                : ""
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {/*
       * --------------------------------------------------
       * FEED
       * --------------------------------------------------
       */}

      <section className="feed">
        {shown.length ? (
          shown.map(
            (post) => (
              <PostCard
                key={`${post.id}-${
                  post.reposted_by
                    ? "repost"
                    : "original"
                }`}
                post={post}
              />
            )
          )
        ) : (
          <div className="empty">
            <p>
              {tab ===
              "Reposts"
                ? "nenhum repost por aqui."
                : "ainda tá quieto por aqui."}
            </p>

            {tab !==
              "Reposts" &&
              isMe && (
                <a
                  href="/new"
                  className="primary"
                >
                  adicionar uma
                  música
                </a>
              )}
          </div>
        )}
      </section>

      {shareOpen && (
        <div
          role="presentation"
          onClick={() =>
            setShareOpen(false)
          }
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            background:
              "rgba(0,0,0,.30)",
            backdropFilter:
              "blur(3px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Compartilhar perfil"
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              position: "relative",
              width:
                "min(100%, 620px)",
              padding:
                "10px 18px calc(28px + var(--safe))",
              borderRadius:
                "30px 30px 0 0",
              background: "#fbfbfa",
              boxShadow:
                "0 -20px 80px rgba(0,0,0,.18)",
            }}
          >
            <div
              style={{
                width: 38,
                height: 5,
                margin:
                  "2px auto 20px",
                borderRadius: 99,
                background: "#d2d2d2",
              }}
            />

            <button
              type="button"
              aria-label="Fechar"
              onClick={() =>
                setShareOpen(false)
              }
              style={{
                position: "absolute",
                top: 20,
                right: 18,
                width: 42,
                height: 42,
                padding: 0,
                border: 0,
                borderRadius: "50%",
                background:
                  "transparent",
                color: "#666",
                display: "grid",
                placeItems: "center",
              }}
            >
              <X size={21} />
            </button>

            <div
              style={{
                padding:
                  "2px 52px 16px",
                textAlign: "center",
              }}
            >
              <div
                className="brand"
                style={{
                  fontSize: 28,
                }}
              >
                aux.
              </div>

              <h2
                style={{
                  margin:
                    "9px 0 4px",
                  fontSize: 24,
                  letterSpacing:
                    "-0.04em",
                }}
              >
                compartilhar perfil
              </h2>

              <p
                className="subtle"
                style={{
                  margin: 0,
                  fontSize: 14,
                }}
              >
                @{profile.username}
              </p>
            </div>

            <button
              type="button"
              className="choice"
              disabled={shareBusy}
              onClick={() =>
                void shareProfileCard()
              }
            >
              <span className="choiceIcon">
                <ImageIcon
                  size={27}
                />
              </span>

              <div>
                <strong>
                  Card do perfil
                </strong>
                <span>
                  sua rotação em formato
                  de Story
                </span>
              </div>
            </button>

            <button
              type="button"
              className="choice"
              disabled={shareBusy}
              onClick={() =>
                void shareProfileLink()
              }
            >
              <span className="choiceIcon">
                <Share2 size={27} />
              </span>

              <div>
                <strong>
                  Compartilhar link
                </strong>
                <span>
                  envie o perfil pelo
                  menu do celular
                </span>
              </div>
            </button>

            <button
              type="button"
              className="choice"
              disabled={shareBusy}
              onClick={() =>
                void copyProfileLink()
              }
            >
              <span className="choiceIcon">
                {shareMessage ===
                "link do perfil copiado." ? (
                  <Check size={27} />
                ) : (
                  <Copy size={27} />
                )}
              </span>

              <div>
                <strong>
                  Copiar link
                </strong>
                <span>
                  copie o endereço de
                  @{profile.username}
                </span>
              </div>
            </button>

            {shareBusy && (
              <p
                className="subtle"
                style={{
                  margin:
                    "14px 0 0",
                  textAlign: "center",
                  fontSize: 13,
                }}
              >
                criando seu card...
              </p>
            )}

            {shareMessage &&
              !shareBusy && (
                <div
                  className="success"
                  style={{
                    marginTop: 12,
                    textAlign:
                      "center",
                  }}
                >
                  {shareMessage}
                </div>
              )}
          </section>
        </div>
      )}
    </main>
  );
}