"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import TrackPreview from "@/components/music/TrackPreview";
import Avatar from "@/components/ui/Avatar";

import type {
  Profile,
  ResolvedTrack,
} from "@/types";

import { IS_DEMO } from "@/lib/config";
import { demoProfiles } from "@/lib/data/demo";
import { createClient } from "@/lib/supabase/client";

/*
 * =========================================================
 * TIPOS LOCAIS DO DISCOVER
 * =========================================================
 */

type DiscoverTrack = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  artwork_url: string | null;
  source_url: string;
};

type DiscoverAuthor = {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
};

type DiscoverPost = {
  id: string;
  type: "review" | "memory";
  body: string;
  rating: number | null;
  created_at: string;

  track:
    | DiscoverTrack
    | DiscoverTrack[];

  author:
    | DiscoverAuthor
    | DiscoverAuthor[];
};

/*
 * =========================================================
 * HELPERS
 * =========================================================
 */

function one<T>(
  value: T | T[]
): T {
  return Array.isArray(value)
    ? value[0]
    : value;
}

function stars(
  rating: number | null
) {
  if (!rating) {
    return "";
  }

  const full =
    Math.floor(rating);

  const half =
    rating % 1 >= 0.5;

  return (
    "★".repeat(full) +
    (half ? "½" : "")
  );
}

/*
 * =========================================================
 * DISCOVER
 * =========================================================
 */

export default function Discover() {
  const [q, setQ] =
    useState("");

  const [tracks, setTracks] =
    useState<ResolvedTrack[]>(
      []
    );

  const [people, setPeople] =
    useState<Profile[]>([]);

  const [recentPosts, setRecentPosts] =
    useState<DiscoverPost[]>(
      []
    );

  const [
    recentPeople,
    setRecentPeople,
  ] = useState<Profile[]>([]);

  const [busy, setBusy] =
    useState(false);

  const [
    loadingDiscover,
    setLoadingDiscover,
  ] = useState(true);

  const [searched, setSearched] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * =====================================================
   * CONTEÚDO INICIAL REAL
   * =====================================================
   */

  useEffect(() => {
    if (IS_DEMO) {
      setRecentPeople(
        demoProfiles.slice(0, 4)
      );

      setLoadingDiscover(false);

      return;
    }

    let active = true;

    async function loadDiscover() {
      try {
        const supabase =
          createClient();

        /*
         * Posts recentes.
         */

        const {
          data: postsData,
          error: postsError,
        } = await supabase
          .from("posts")
          .select(
            `
              id,
              type,
              body,
              rating,
              created_at,

              track:tracks!posts_track_id_fkey(
                id,
                title,
                artist,
                album,
                artwork_url,
                source_url
              ),

              author:profiles!posts_user_id_fkey(
                id,
                username,
                display_name,
                bio,
                avatar_url
              )
            `
          )
          .eq(
            "visibility",
            "public"
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(16);

        if (postsError) {
          throw postsError;
        }

        /*
         * Perfis reais.
         */

        const {
          data: peopleData,
          error: peopleError,
        } = await supabase
          .from("profiles")
          .select(
            `
              id,
              username,
              display_name,
              bio,
              avatar_url
            `
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(5);

        if (peopleError) {
          throw peopleError;
        }

        if (!active) {
          return;
        }

        setRecentPosts(
          (postsData ??
            []) as unknown as DiscoverPost[]
        );

        setRecentPeople(
          (peopleData ??
            []) as Profile[]
        );
      } catch {
        /*
         * Discover continua utilizável
         * mesmo se o conteúdo inicial
         * falhar.
         *
         * A busca permanece disponível.
         */
      } finally {
        if (active) {
          setLoadingDiscover(
            false
          );
        }
      }
    }

    void loadDiscover();

    return () => {
      active = false;
    };
  }, []);

  /*
   * =====================================================
   * SEARCH
   * =====================================================
   */

  async function go() {
    const term =
      q.trim();

    if (
      term.length < 2
    ) {
      return;
    }

    setBusy(true);
    setError("");
    setSearched(true);

    try {
      /*
       * Busca musical.
       */

      const musicRequest =
        fetch(
          `/api/music/search?q=${encodeURIComponent(
            term
          )}`
        ).then(
          async (response) => {
            const json =
              await response.json();

            if (
              !response.ok
            ) {
              throw new Error(
                json.error ??
                  "busca indisponível."
              );
            }

            return json;
          }
        );

      /*
       * Busca de pessoas.
       */

      let found: Profile[] =
        [];

      if (IS_DEMO) {
        found =
          demoProfiles.filter(
            (profile) =>
              `${profile.username} ${profile.display_name}`
                .toLowerCase()
                .includes(
                  term.toLowerCase()
                )
          );
      } else {
        const supabase =
          createClient();

        /*
         * Remove curingas do
         * ilike para a busca
         * continuar previsível.
         */

        const safe =
          term.replace(
            /[%_]/g,
            ""
          );

        const [
          usernameResult,
          nameResult,
        ] =
          await Promise.all([
            supabase
              .from(
                "profiles"
              )
              .select(
                `
                  id,
                  username,
                  display_name,
                  bio,
                  avatar_url
                `
              )
              .ilike(
                "username",
                `%${safe}%`
              )
              .limit(8),

            supabase
              .from(
                "profiles"
              )
              .select(
                `
                  id,
                  username,
                  display_name,
                  bio,
                  avatar_url
                `
              )
              .ilike(
                "display_name",
                `%${safe}%`
              )
              .limit(8),
          ]);

        const map =
          new Map<
            string,
            Profile
          >();

        [
          ...(usernameResult.data ??
            []),

          ...(nameResult.data ??
            []),
        ].forEach(
          (profile) => {
            map.set(
              profile.id,
              profile as Profile
            );
          }
        );

        found = [
          ...map.values(),
        ].slice(0, 8);
      }

      const music =
        await musicRequest;

      setTracks(
        music.tracks ?? []
      );

      setPeople(found);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "busca indisponível."
      );
    } finally {
      setBusy(false);
    }
  }

  /*
   * =====================================================
   * AO LIMPAR A BUSCA
   * =====================================================
   */

  function changeQuery(
    value: string
  ) {
    setQ(value);

    if (!value.trim()) {
      setSearched(false);
      setTracks([]);
      setPeople([]);
      setError("");
    }
  }

  /*
   * =====================================================
   * MÚSICAS RECENTES ÚNICAS
   * =====================================================
   */

  const recentTracks: DiscoverPost[] =
    [];

  const seenTracks =
    new Set<string>();

  for (
    const post of recentPosts
  ) {
    const track =
      one(post.track);

    if (
      !track ||
      !track.artwork_url ||
      seenTracks.has(
        track.id
      )
    ) {
      continue;
    }

    seenTracks.add(
      track.id
    );

    recentTracks.push(
      post
    );

    if (
      recentTracks.length ===
      4
    ) {
      break;
    }
  }

  /*
   * =====================================================
   * REVIEWS RECENTES
   * =====================================================
   */

  const reviews =
    recentPosts
      .filter(
        (post) =>
          post.type ===
          "review"
      )
      .slice(0, 3);

  /*
   * =====================================================
   * UI
   * =====================================================
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

        <span className="pill">
          Discover
        </span>
      </header>

      <h1 className="pageTitle">
        o que tá por aí?
      </h1>

      {/*
       * --------------------------------------------------
       * SEARCH
       * --------------------------------------------------
       */}

      <div className="searchbar">
        <input
          className="field"
          placeholder="música, artista ou pessoa"
          value={q}
          onChange={(
            event
          ) =>
            changeQuery(
              event.target.value
            )
          }
          onKeyDown={(
            event
          ) => {
            if (
              event.key ===
              "Enter"
            ) {
              void go();
            }
          }}
        />

        <button
          className="primary"
          aria-label="Buscar"
          disabled={busy}
          onClick={() =>
            void go()
          }
        >
          <Search
            size={18}
          />
        </button>
      </div>

      {busy && (
        <p className="subtle">
          procurando...
        </p>
      )}

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {/*
       * ==================================================
       * RESULTADOS DA BUSCA
       * ==================================================
       */}

      {searched && (
        <>
          {people.length >
            0 && (
            <>
              <h2 className="sectionTitle">
                pessoas
              </h2>

              <div className="results">
                {people.map(
                  (profile) => (
                    <Link
                      className="choice"
                      key={
                        profile.id
                      }
                      href={`/u/${profile.username}`}
                    >
                      <Avatar
                        profile={
                          profile
                        }
                      />

                      <div>
                        <strong>
                          {
                            profile.display_name
                          }
                        </strong>

                        <span>
                          @
                          {
                            profile.username
                          }
                        </span>
                      </div>
                    </Link>
                  )
                )}
              </div>
            </>
          )}

          {tracks.length >
            0 && (
            <>
              <h2 className="sectionTitle">
                músicas
              </h2>

              <div className="results">
                {tracks.map(
                  (
                    track,
                    index
                  ) => (
                    <Link
                      key={`${track.provider_track_id}-${index}`}
                      href={`/new?mode=link&url=${encodeURIComponent(
                        track.source_url
                      )}`}
                      style={{
                        textDecoration:
                          "none",
                        color:
                          "inherit",
                      }}
                    >
                      <TrackPreview
                        track={
                          track
                        }
                      />
                    </Link>
                  )
                )}
              </div>
            </>
          )}

          {!busy &&
            !error &&
            !people.length &&
            !tracks.length && (
              <div className="empty">
                <p>
                  não achei nada
                  com esse nome.
                </p>
              </div>
            )}
        </>
      )}

      {/*
       * ==================================================
       * DISCOVER INICIAL
       * ==================================================
       */}

      {!searched && (
        <>
          {loadingDiscover ? (
            <p className="subtle">
              carregando...
            </p>
          ) : (
            <>
              {/*
               * ------------------------------------------
               * TOCANDO POR AQUI
               * ------------------------------------------
               */}

              {recentTracks.length >
                0 && (
                <section
                  style={{
                    marginTop:
                      36,
                  }}
                >
                  <h2
                    style={{
                      margin:
                        "0 0 13px",

                      fontSize:
                        16,

                      letterSpacing:
                        "-0.02em",
                    }}
                  >
                    tocando por aqui
                  </h2>

                  <div
                    style={{
                      display:
                        "grid",

                      gridTemplateColumns:
                        `repeat(${recentTracks.length}, 1fr)`,

                      gap: 9,
                    }}
                  >
                    {recentTracks.map(
                      (
                        post
                      ) => {
                        const track =
                          one(
                            post.track
                          );

                        return (
                          <Link
                            key={
                              post.id
                            }
                            href={`/p/${post.id}`}
                            title={`${track.title} — ${track.artist}`}
                            style={{
                              display:
                                "block",

                              aspectRatio:
                                "1 / 1",

                              borderRadius:
                                16,

                              overflow:
                                "hidden",

                              background:
                                "#ececea",
                            }}
                          >
                            <img
                              src={
                                track.artwork_url!
                              }
                              alt={`Capa de ${track.title}`}
                              style={{
                                display:
                                  "block",

                                width:
                                  "100%",

                                height:
                                  "100%",

                                objectFit:
                                  "cover",
                              }}
                            />
                          </Link>
                        );
                      }
                    )}
                  </div>
                </section>
              )}

              {/*
               * ------------------------------------------
               * REVIEWS RECENTES
               * ------------------------------------------
               */}

              {reviews.length >
                0 && (
                <section
                  style={{
                    marginTop:
                      38,
                  }}
                >
                  <h2
                    style={{
                      margin:
                        "0 0 13px",

                      fontSize:
                        16,

                      letterSpacing:
                        "-0.02em",
                    }}
                  >
                    reviews recentes
                  </h2>

                  <div className="stack">
                    {reviews.map(
                      (
                        review
                      ) => {
                        const track =
                          one(
                            review.track
                          );

                        const author =
                          one(
                            review.author
                          );

                        return (
                          <Link
                            key={
                              review.id
                            }
                            href={`/p/${review.id}`}
                            style={{
                              color:
                                "inherit",

                              textDecoration:
                                "none",

                              display:
                                "block",

                              padding:
                                "16px",

                              border:
                                "1px solid rgba(0,0,0,.08)",

                              borderRadius:
                                20,

                              background:
                                "rgba(255,255,255,.76)",
                            }}
                          >
                            <div
                              style={{
                                display:
                                  "flex",

                                alignItems:
                                  "center",

                                gap: 10,
                              }}
                            >
                              <Avatar
                                profile={
                                  author
                                }
                              />

                              <div
                                style={{
                                  minWidth:
                                    0,

                                  flex: 1,
                                }}
                              >
                                <div
                                  style={{
                                    display:
                                      "flex",

                                    alignItems:
                                      "center",

                                    justifyContent:
                                      "space-between",

                                    gap: 10,
                                  }}
                                >
                                  <strong>
                                    @
                                    {
                                      author.username
                                    }
                                  </strong>

                                  {review.rating && (
                                    <span
                                      style={{
                                        fontSize:
                                          13,

                                        letterSpacing:
                                          1,
                                      }}
                                    >
                                      {stars(
                                        review.rating
                                      )}
                                    </span>
                                  )}
                                </div>

                                <div
                                  className="subtle"
                                  style={{
                                    fontSize:
                                      12,

                                    marginTop:
                                      2,
                                  }}
                                >
                                  {
                                    track.title
                                  }{" "}
                                  ·{" "}
                                  {
                                    track.artist
                                  }
                                </div>
                              </div>
                            </div>

                            <p
                              style={{
                                margin:
                                  "13px 0 0",

                                lineHeight:
                                  1.45,

                                fontSize:
                                  14,
                              }}
                            >
                              “
                              {review.body.length >
                              150
                                ? `${review.body.slice(
                                    0,
                                    147
                                  )}…`
                                : review.body}
                              ”
                            </p>
                          </Link>
                        );
                      }
                    )}
                  </div>
                </section>
              )}

              {/*
               * ------------------------------------------
               * PESSOAS
               * ------------------------------------------
               */}

              {recentPeople.length >
                0 && (
                <section
                  style={{
                    marginTop:
                      38,

                    paddingBottom:
                      30,
                  }}
                >
                  <h2
                    style={{
                      margin:
                        "0 0 13px",

                      fontSize:
                        16,

                      letterSpacing:
                        "-0.02em",
                    }}
                  >
                    pessoas
                  </h2>

                  <div className="results">
                    {recentPeople
                      .slice(
                        0,
                        4
                      )
                      .map(
                        (
                          profile
                        ) => (
                          <Link
                            className="choice"
                            key={
                              profile.id
                            }
                            href={`/u/${profile.username}`}
                          >
                            <Avatar
                              profile={
                                profile
                              }
                            />

                            <div>
                              <strong>
                                {
                                  profile.display_name
                                }
                              </strong>

                              <span>
                                @
                                {
                                  profile.username
                                }
                              </span>
                            </div>
                          </Link>
                        )
                      )}
                  </div>
                </section>
              )}

              {/*
               * ------------------------------------------
               * COMUNIDADE AINDA VAZIA
               * ------------------------------------------
               */}

              {!recentTracks.length &&
                !reviews.length &&
                !recentPeople.length && (
                  <div className="empty">
                    <p>
                      ainda tá
                      quieto por
                      aqui.
                    </p>
                  </div>
                )}
            </>
          )}
        </>
      )}
    </main>
  );
}