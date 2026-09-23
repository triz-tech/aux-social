"use client";

import {
  Check,
  Copy,
  ImageIcon,
  Moon,
  Pencil,
  Share2,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
} from "react";

import type {
  Post,
  Profile,
} from "@/types";

import PostCard from "@/components/post/PostCard";
import styles from "./ProfileView.module.css";
import { shareProfileStory } from "@/components/share/profileStory";

import { IS_DEMO } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

type Tab =
  | "All"
  | "Reviews"
  | "Memories"
  | "Reposts";

type SocialListMode =
  | "followers"
  | "following";

type SocialProfile = Pick<
  Profile,
  | "id"
  | "username"
  | "display_name"
  | "avatar_url"
  | "bio"
>;


type ProfileTopTrack = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  artwork_url: string | null;
  source_url: string;
};

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

  const [theme, setTheme] =
    useState<"light" | "dark">(
      "light"
    );

  const [shareOpen, setShareOpen] =
    useState(false);

  const [shareBusy, setShareBusy] =
    useState(false);

  const [shareMessage, setShareMessage] =
    useState("");

  const [socialOpen, setSocialOpen] =
    useState<SocialListMode | null>(null);

  const [socialProfiles, setSocialProfiles] =
    useState<SocialProfile[]>([]);

  const [socialBusy, setSocialBusy] =
    useState(false);

  const [socialError, setSocialError] =
    useState("");


  const [topFive, setTopFive] =
    useState<ProfileTopTrack[]>([]);

  const [topFiveLoading, setTopFiveLoading] =
    useState(true);

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
   * TOP 5
   * ======================================================
   */

  useEffect(() => {
    let active = true;

    async function loadTopFive() {
      setTopFiveLoading(true);

      try {
        if (IS_DEMO) {
          if (
            social.viewerId ===
            profile.id
          ) {
            const raw =
              localStorage.getItem(
                "aux-demo-top-five"
              );

            if (
              raw &&
              active
            ) {
              const parsed =
                JSON.parse(raw) as ProfileTopTrack[];

              setTopFive(
                parsed.slice(0, 5)
              );
            }
          }

          return;
        }

        const supabase =
          createClient();

        const {
          data,
          error,
        } = await supabase
          .from(
            "profile_top_tracks"
          )
          .select(
            `
              position,
              track:tracks (
                id,
                title,
                artist,
                album,
                artwork_url,
                source_url
              )
            `
          )
          .eq(
            "user_id",
            profile.id
          )
          .order(
            "position",
            {
              ascending: true,
            }
          );

        if (error) {
          throw error;
        }

        type TopFiveRow = {
          position: number;
          track:
            | ProfileTopTrack
            | ProfileTopTrack[]
            | null;
        };

        const rows =
          (data ?? []) as unknown as TopFiveRow[];

        const selected =
          rows
            .sort(
              (a, b) =>
                a.position -
                b.position
            )
            .flatMap(
              (row) => {
                const track =
                  Array.isArray(
                    row.track
                  )
                    ? row.track[0]
                    : row.track;

                return track
                  ? [track]
                  : [];
              }
            )
            .slice(0, 5);

        if (active) {
          setTopFive(
            selected
          );
        }
      } catch (error) {
        console.error(
          "AUX top 3:",
          error
        );

        if (active) {
          setTopFive([]);
        }
      } finally {
        if (active) {
          setTopFiveLoading(
            false
          );
        }
      }
    }

    void loadTopFive();

    return () => {
      active = false;
    };
  }, [
    profile.id,
    social.viewerId,
  ]);

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
    if (topFiveLoading) {
      setShareMessage(
        "carregando seu top..."
      );
      return;
    }

    setShareBusy(true);
    setShareMessage("");

    try {
      const result =
        await shareProfileStory(
          profile,
          topFive
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
   * SEGUIDORES / SEGUINDO
   * ======================================================
   */

  async function openSocialList(
    mode: SocialListMode
  ) {
    setSocialOpen(mode);
    setSocialProfiles([]);
    setSocialError("");

    if (IS_DEMO) {
      setSocialError(
        "lista indisponível no modo demo."
      );
      return;
    }

    setSocialBusy(true);

    try {
      const supabase =
        createClient();

      let ids: string[] = [];

      /*
       * Mantemos as duas consultas explícitas para o TypeScript
       * entender corretamente o tipo retornado pelo Supabase.
       */
      if (mode === "followers") {
        const {
          data: relationships,
          error: relationshipsError,
        } = await supabase
          .from("follows")
          .select("follower_id")
          .eq(
            "following_id",
            profile.id
          );

        if (relationshipsError) {
          throw relationshipsError;
        }

        ids = (
          relationships || []
        )
          .map(
            (row) =>
              row.follower_id
          )
          .filter(
            (
              id
            ): id is string =>
              typeof id === "string"
          );
      } else {
        const {
          data: relationships,
          error: relationshipsError,
        } = await supabase
          .from("follows")
          .select("following_id")
          .eq(
            "follower_id",
            profile.id
          );

        if (relationshipsError) {
          throw relationshipsError;
        }

        ids = (
          relationships || []
        )
          .map(
            (row) =>
              row.following_id
          )
          .filter(
            (
              id
            ): id is string =>
              typeof id === "string"
          );
      }

      if (!ids.length) {
        setSocialProfiles([]);
        return;
      }

      const {
        data: people,
        error: peopleError,
      } = await supabase
        .from("profiles")
        .select(
          `
            id,
            username,
            display_name,
            avatar_url,
            bio
          `
        )
        .in("id", ids);

      if (peopleError) {
        throw peopleError;
      }

      const byId = new Map(
        (people || []).map(
          (person) => [
            person.id,
            person,
          ]
        )
      );

      setSocialProfiles(
        ids
          .map((id) =>
            byId.get(id)
          )
          .filter(
            (
              person
            ): person is SocialProfile =>
              Boolean(person)
          )
      );
    } catch (error) {
      console.error(
        "AUX social list:",
        error
      );

      setSocialError(
        "não consegui carregar essa lista."
      );
    } finally {
      setSocialBusy(false);
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
   * TEMA
   * ======================================================
   *
   * O controle fica apenas no próprio perfil.
   * O tema, porém, continua valendo para o AUX inteiro.
   */
  useEffect(() => {
    const current =
      document.documentElement
        .dataset.theme;

    if (
      current === "dark" ||
      current === "light"
    ) {
      setTheme(current);
      return;
    }

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

    setTheme(next);
  }, []);

  function toggleTheme() {
    const next =
      theme === "dark"
        ? "light"
        : "dark";

    setTheme(next);

    document.documentElement
      .dataset.theme = next;

    localStorage.setItem(
      "aux-theme",
      next
    );
  }

  /*
   * ======================================================
   * UI
   * ======================================================
   */

  return (
    <main className={`shell ${styles.page}`}>
      {/*
       * --------------------------------------------------
       * HEADER
       * --------------------------------------------------
       */}

      <header className={`topbar ${styles.topbar}`}>
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
            <>
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

              <button
                type="button"
                className="pill"
                onClick={
                  toggleTheme
                }
                aria-label={
                  theme === "dark"
                    ? "Usar tema claro"
                    : "Usar tema escuro"
                }
                title={
                  theme === "dark"
                    ? "Tema claro"
                    : "Tema escuro"
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
                {theme ===
                "dark" ? (
                  <Sun
                    size={16}
                  />
                ) : (
                  <Moon
                    size={16}
                  />
                )}
              </button>
            </>
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
        className={styles.profileHero}
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
          className={styles.avatar}
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

        <div className={styles.profileInfo}>
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
          <button
            type="button"
            onClick={() =>
              void openSocialList(
                "followers"
              )
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: 0,
              border: 0,
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
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
          </button>

          <span
            className="subtle"
            style={{
              margin:
                "0 3px",
            }}
          >
            ·
          </span>

          <button
            type="button"
            onClick={() =>
              void openSocialList(
                "following"
              )
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: 0,
              border: 0,
              background: "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            <strong>
              {social.following}
            </strong>

            <span className="subtle">
              seguindo
            </span>
          </button>
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
        </div>
      </section>

      {/*
       * --------------------------------------------------
       * TOP 5
       * --------------------------------------------------
       */}

      {!topFiveLoading &&
        topFive.length > 0 && (
        <section
          className={styles.topSection}
          style={{
            marginTop: 32,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems:
                "baseline",
              justifyContent:
                "space-between",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing:
                  "-0.02em",
              }}
            >
              {`top ${topFive.length}`}
            </div>

            {isMe && (
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/settings"
                  )
                }
                className="subtle"
                style={{
                  padding: 0,
                  border: 0,
                  background:
                    "transparent",
                  fontSize: 12,
                  cursor:
                    "pointer",
                }}
              >
                editar
              </button>
            )}
          </div>

          {topFive.length === 1 ? (
            <a
              href={topFive[0].source_url}
              target="_blank"
              rel="noreferrer"
              title={`${topFive[0].title} — ${topFive[0].artist}`}
              style={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: "108px minmax(0, 1fr)",
                alignItems: "center",
                gap: 16,
                padding: 10,
                border: "1px solid rgba(0,0,0,.07)",
                borderRadius: 22,
                background: "rgba(255,255,255,.78)",
                color: "inherit",
                textDecoration: "none",
                boxShadow: "0 12px 34px rgba(0,0,0,.055)",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: 108,
                  height: 108,
                  overflow: "hidden",
                  borderRadius: 17,
                  background: "#ececea",
                  boxShadow: "0 8px 20px rgba(0,0,0,.08)",
                }}
              >
                {topFive[0].artwork_url ? (
                  <img
                    src={topFive[0].artwork_url}
                    alt={`Capa de ${topFive[0].title}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "block",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "grid",
                      placeItems: "center",
                      color: "#8a8a86",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    aux.
                  </div>
                )}

                <div
                  style={{
                    position: "absolute",
                    top: 7,
                    left: 7,
                    minWidth: 23,
                    height: 23,
                    padding: "0 6px",
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(255,255,255,.92)",
                    color: "#111",
                    fontSize: 10,
                    fontWeight: 800,
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 3px 10px rgba(0,0,0,.08)",
                  }}
                >
                  1
                </div>
              </div>

              <div
                style={{
                  minWidth: 0,
                  paddingRight: 8,
                }}
              >
                <div
                  className="subtle"
                  style={{
                    marginBottom: 6,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                  }}
                >
                  em destaque
                </div>

                <strong
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontSize: 18,
                    lineHeight: 1.15,
                    letterSpacing: "-0.035em",
                  }}
                >
                  {topFive[0].title}
                </strong>

                <span
                  style={{
                    display: "block",
                    marginTop: 6,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {topFive[0].artist}
                </span>

                {topFive[0].album && (
                  <span
                    className="subtle"
                    style={{
                      display: "block",
                      marginTop: 3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: 12,
                    }}
                  >
                    {topFive[0].album}
                  </span>
                )}
              </div>
            </a>
          ) : topFive.length === 5 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 1fr) minmax(0, 1fr)",
                gap: 8,
                alignItems: "stretch",
              }}
            >
              <a
                href={topFive[0].source_url}
                target="_blank"
                rel="noreferrer"
                title={`1. ${topFive[0].title} — ${topFive[0].artist}`}
                style={{
                  position: "relative",
                  minWidth: 0,
                  aspectRatio: "1 / 1",
                  overflow: "hidden",
                  borderRadius: 20,
                  background: "#ececea",
                  color: "white",
                  textDecoration: "none",
                  boxShadow: "0 10px 28px rgba(0,0,0,.075)",
                }}
              >
                {topFive[0].artwork_url ? (
                  <img
                    src={topFive[0].artwork_url}
                    alt={`Capa de ${topFive[0].title}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "block",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "grid",
                      placeItems: "center",
                      color: "#8a8a86",
                      background: "#ececea",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    aux.
                  </div>
                )}

                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(to top, rgba(0,0,0,.58) 0%, rgba(0,0,0,.06) 46%, transparent 68%)",
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    top: 9,
                    left: 9,
                    minWidth: 26,
                    height: 26,
                    padding: "0 7px",
                    borderRadius: 999,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(255,255,255,.92)",
                    color: "#111",
                    fontSize: 10,
                    fontWeight: 800,
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 3px 10px rgba(0,0,0,.08)",
                  }}
                >
                  1
                </div>

                <div
                  style={{
                    position: "absolute",
                    left: 12,
                    right: 12,
                    bottom: 11,
                    minWidth: 0,
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: 14,
                      lineHeight: 1.12,
                      letterSpacing: "-0.025em",
                      textShadow: "0 1px 8px rgba(0,0,0,.22)",
                    }}
                  >
                    {topFive[0].title}
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: 3,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: 10,
                      opacity: 0.88,
                      textShadow: "0 1px 8px rgba(0,0,0,.22)",
                    }}
                  >
                    {topFive[0].artist}
                  </span>
                </div>
              </a>

              <div
                style={{
                  minWidth: 0,
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gridTemplateRows:
                    "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {topFive
                  .slice(1, 5)
                  .map(
                    (
                      track,
                      index
                    ) => (
                      <a
                        key={track.id}
                        href={track.source_url}
                        target="_blank"
                        rel="noreferrer"
                        title={`${index + 2}. ${track.title} — ${track.artist}`}
                        style={{
                          position: "relative",
                          minWidth: 0,
                          aspectRatio: "1 / 1",
                          overflow: "hidden",
                          borderRadius: 14,
                          background: "#ececea",
                          color: "white",
                          textDecoration: "none",
                          boxShadow:
                            "0 6px 18px rgba(0,0,0,.055)",
                        }}
                      >
                        {track.artwork_url ? (
                          <img
                            src={track.artwork_url}
                            alt={`Capa de ${track.title}`}
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "block",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "grid",
                              placeItems: "center",
                              color: "#8a8a86",
                              fontSize: 10,
                              fontWeight: 700,
                            }}
                          >
                            aux.
                          </div>
                        )}

                        <div
                          style={{
                            position: "absolute",
                            top: 6,
                            left: 6,
                            minWidth: 21,
                            height: 21,
                            padding: "0 5px",
                            borderRadius: 999,
                            display: "grid",
                            placeItems: "center",
                            background: "rgba(255,255,255,.90)",
                            color: "#111",
                            fontSize: 9,
                            fontWeight: 800,
                            backdropFilter: "blur(8px)",
                            boxShadow:
                              "0 3px 10px rgba(0,0,0,.08)",
                          }}
                        >
                          {index + 2}
                        </div>
                      </a>
                    )
                  )}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  topFive.length === 2
                    ? "repeat(2, minmax(0, 145px))"
                    : `repeat(${topFive.length}, minmax(0, 1fr))`,
                justifyContent:
                  topFive.length === 2
                    ? "center"
                    : "stretch",
                gap: 8,
              }}
            >
              {topFive.map(
                (
                  track,
                  index
                ) => (
                  <a
                    key={track.id}
                    href={track.source_url}
                    target="_blank"
                    rel="noreferrer"
                    title={`${index + 1}. ${track.title} — ${track.artist}`}
                    style={{
                      position: "relative",
                      minWidth: 0,
                      aspectRatio: "1 / 1",
                      overflow: "hidden",
                      borderRadius: 14,
                      background: "#ececea",
                      color: "white",
                      textDecoration: "none",
                      boxShadow: "0 8px 22px rgba(0,0,0,.065)",
                    }}
                  >
                    {track.artwork_url ? (
                      <img
                        src={track.artwork_url}
                        alt={`Capa de ${track.title}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "block",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "grid",
                          placeItems: "center",
                          color: "#8a8a86",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        aux.
                      </div>
                    )}

                    <div
                      style={{
                        position: "absolute",
                        top: 6,
                        left: 6,
                        minWidth: 21,
                        height: 21,
                        padding: "0 5px",
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        background: "rgba(255,255,255,.90)",
                        color: "#111",
                        fontSize: 9,
                        fontWeight: 800,
                        backdropFilter: "blur(8px)",
                        boxShadow: "0 3px 10px rgba(0,0,0,.08)",
                      }}
                    >
                      {index + 1}
                    </div>
                  </a>
                )
              )}
            </div>
          )}
        </section>
      )}

      {/*
       * --------------------------------------------------
       * TABS
       * --------------------------------------------------
       */}

      <div
        className={styles.tabsSpacer}
        style={{
          height: 12,
        }}
      />

      <div className={`tabs ${styles.tabs}`}>
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

      <section className={`feed ${styles.feed}`}>
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

      {socialOpen && (
        <div
          role="presentation"
          onClick={() =>
            setSocialOpen(null)
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
            aria-label={
              socialOpen ===
              "followers"
                ? "Seguidores"
                : "Seguindo"
            }
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              position: "relative",
              width:
                "min(100%, 520px)",
              maxHeight: "72dvh",
              overflow: "auto",
              padding:
                "10px 18px calc(26px + var(--safe))",
              borderRadius:
                "30px 30px 0 0",
              background: "var(--surface-solid)",
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
                background: "var(--line)",
              }}
            />

            <button
              type="button"
              aria-label="Fechar"
              onClick={() =>
                setSocialOpen(null)
              }
              style={{
                position: "absolute",
                top: 19,
                right: 18,
                width: 42,
                height: 42,
                padding: 0,
                border: 0,
                borderRadius: "50%",
                background:
                  "transparent",
                color: "var(--muted)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <X size={21} />
            </button>

            <div
              style={{
                padding:
                  "2px 52px 18px",
                textAlign: "center",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: 25,
                  letterSpacing:
                    "-0.04em",
                }}
              >
                {socialOpen ===
                "followers"
                  ? "seguidores"
                  : "seguindo"}
              </h2>

              <p
                className="subtle"
                style={{
                  margin:
                    "5px 0 0",
                  fontSize: 13,
                }}
              >
                @{profile.username}
              </p>
            </div>

            {socialBusy ? (
              <div
                className="empty"
                style={{
                  padding:
                    "36px 12px",
                }}
              >
                <p>
                  carregando...
                </p>
              </div>
            ) : socialError ? (
              <div className="error">
                {socialError}
              </div>
            ) : socialProfiles.length ? (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                }}
              >
                {socialProfiles.map(
                  (person) => (
                    <button
                      type="button"
                      key={person.id}
                      onClick={() => {
                        setSocialOpen(
                          null
                        );

                        router.push(
                          `/u/${person.username}`
                        );
                      }}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems:
                          "center",
                        gap: 12,
                        padding: 11,
                        border:
                          "1px solid var(--line)",
                        borderRadius: 18,
                        background:
                          "var(--surface-solid)",
                        color:
                          "inherit",
                        textAlign:
                          "left",
                      }}
                    >
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          flex:
                            "0 0 46px",
                          overflow:
                            "hidden",
                          borderRadius:
                            "50%",
                          display:
                            "grid",
                          placeItems:
                            "center",
                          background:
                            "#eeeeec",
                        }}
                      >
                        {person.avatar_url ? (
                          <img
                            src={
                              person.avatar_url
                            }
                            alt=""
                            style={{
                              width:
                                "100%",
                              height:
                                "100%",
                              objectFit:
                                "cover",
                            }}
                          />
                        ) : (
                          <UserRound
                            size={20}
                          />
                        )}
                      </div>

                      <div
                        style={{
                          minWidth: 0,
                          flex: 1,
                        }}
                      >
                        <strong
                          style={{
                            display:
                              "block",
                            overflow:
                              "hidden",
                            textOverflow:
                              "ellipsis",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {
                            person.display_name
                          }
                        </strong>

                        <span
                          className="subtle"
                          style={{
                            display:
                              "block",
                            marginTop: 2,
                            fontSize: 12,
                          }}
                        >
                          @{person.username}
                        </span>
                      </div>
                    </button>
                  )
                )}
              </div>
            ) : (
              <div
                className="empty"
                style={{
                  padding:
                    "36px 12px",
                }}
              >
                <UserRound
                  size={26}
                  style={{
                    margin:
                      "0 auto 10px",
                    opacity: 0.35,
                  }}
                />

                <p>
                  {socialOpen ===
                  "followers"
                    ? "ainda sem seguidores."
                    : "ainda não segue ninguém."}
                </p>
              </div>
            )}
          </section>
        </div>
      )}

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
              background: "var(--surface-solid)",
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
                background: "var(--line)",
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
                color: "var(--muted)",
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