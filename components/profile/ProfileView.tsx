"use client";

import {
  Pencil,
  Share2,
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

  async function share() {
    const url =
      location.href;

    if (
      navigator.share
    ) {
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
            onClick={() =>
              void share()
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
    </main>
  );
}