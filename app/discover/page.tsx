"use client";

import {
  Hash,
  Search,
  X,
} from "lucide-react";
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

type DiscoverAlbum = {
  id: string;
  title: string;
  artist: string;
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

type TrendingTag = {
  label: string;
  count: number;
};

type DiscoverPost = {
  id: string;
  type: "review" | "memory";
  body: string;
  rating: number | null;
  trend: string | null;
  created_at: string;

  track:
    | DiscoverTrack
    | DiscoverTrack[]
    | null;

  album:
    | DiscoverAlbum
    | DiscoverAlbum[]
    | null;

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

function oneOrNull<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function subjectOf(
  post: DiscoverPost
):
  | DiscoverTrack
  | DiscoverAlbum
  | null {
  return (
    oneOrNull(post.album) ??
    oneOrNull(post.track)
  );
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

function normalizeTag(
  value: string
) {
  return value
    .trim()
    .replace(/^#/, "")
    .trim();
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

  const [
    activeTag,
    setActiveTag,
  ] = useState("");

  const [
    tagPosts,
    setTagPosts,
  ] = useState<DiscoverPost[]>(
    []
  );

  const [tagBusy, setTagBusy] =
    useState(false);

  const [
    trendingTags,
    setTrendingTags,
  ] = useState<TrendingTag[]>(
    []
  );

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

      setTrendingTags([]);

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
              trend,
              created_at,

              track:tracks!posts_track_id_fkey(
                id,
                title,
                artist,
                album,
                artwork_url,
                source_url
              ),

              album:albums!posts_album_id_fkey(
                id,
                title,
                artist,
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
         * Tags mais usadas nos últimos 7 dias.
         * Limitamos a 200 publicações recentes para manter
         * o Discover leve sem precisar de uma RPC nova.
         */

        const since =
          new Date(
            Date.now() -
              7 *
                24 *
                60 *
                60 *
                1000
          ).toISOString();

        const {
          data: trendData,
          error: trendError,
        } = await supabase
          .from("posts")
          .select(
            "trend,created_at"
          )
          .eq(
            "visibility",
            "public"
          )
          .not(
            "trend",
            "is",
            null
          )
          .gte(
            "created_at",
            since
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(200);

        if (trendError) {
          throw trendError;
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

        const tagMap =
          new Map<
            string,
            TrendingTag
          >();

        (
          trendData ?? []
        ).forEach((row) => {
          const label =
            normalizeTag(
              row.trend ?? ""
            );

          if (!label) {
            return;
          }

          const key =
            label.toLowerCase();

          const current =
            tagMap.get(key);

          tagMap.set(key, {
            label:
              current?.label ??
              label,
            count:
              (current?.count ??
                0) + 1,
          });
        });

        setTrendingTags(
          [...tagMap.values()]
            .sort(
              (a, b) =>
                b.count -
                a.count
            )
            .slice(0, 8)
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
   * TAG / TREND
   * =====================================================
   */

  async function loadTag(
    value: string
  ) {
    const clean =
      normalizeTag(value);

    if (!clean) {
      return;
    }

    setActiveTag(clean);
    setTagBusy(true);
    setError("");
    setSearched(false);
    setTracks([]);
    setPeople([]);

    if (IS_DEMO) {
      const matches =
        recentPosts.filter(
          (post) =>
            normalizeTag(
              post.trend ?? ""
            ).toLowerCase() ===
            clean.toLowerCase()
        );

      setTagPosts(matches);
      setTagBusy(false);
      return;
    }

    try {
      const supabase =
        createClient();

      const select = `
        id,
        type,
        body,
        rating,
        trend,
        created_at,

        track:tracks!posts_track_id_fkey(
          id,
          title,
          artist,
          album,
          artwork_url,
          source_url
        ),

        album:albums!posts_album_id_fkey(
          id,
          title,
          artist,
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
      `;

      /*
       * Algumas publicações antigas podem ter
       * sido salvas como "#tag" e outras como
       * "tag". Buscamos as duas formas.
       */
      const [
        plainResult,
        hashResult,
      ] = await Promise.all([
        supabase
          .from("posts")
          .select(select)
          .eq(
            "visibility",
            "public"
          )
          .ilike(
            "trend",
            clean
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(50),

        supabase
          .from("posts")
          .select(select)
          .eq(
            "visibility",
            "public"
          )
          .ilike(
            "trend",
            `#${clean}`
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(50),
      ]);

      if (plainResult.error) {
        throw plainResult.error;
      }

      if (hashResult.error) {
        throw hashResult.error;
      }

      const byId =
        new Map<
          string,
          DiscoverPost
        >();

      [
        ...(plainResult.data ??
          []),
        ...(hashResult.data ??
          []),
      ].forEach((post) => {
        byId.set(
          post.id,
          post as unknown as DiscoverPost
        );
      });

      const matches = [
        ...byId.values(),
      ].sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      );

      setTagPosts(matches);
    } catch (err) {
      setTagPosts([]);

      setError(
        err instanceof Error
          ? err.message
          : "não consegui abrir essa tag."
      );
    } finally {
      setTagBusy(false);
    }
  }

  function clearTag() {
    setActiveTag("");
    setTagPosts([]);
    setQ("");
    setError("");

    window.history.replaceState(
      {},
      "",
      "/discover"
    );
  }

  async function openTag(
    tag: string
  ) {
    const clean =
      normalizeTag(tag);

    if (!clean) {
      return;
    }

    setQ(`#${clean}`);

    window.history.replaceState(
      {},
      "",
      `/discover?tag=${encodeURIComponent(
        clean
      )}`
    );

    await loadTag(clean);
  }

  /*
   * Se a pessoa veio de um #tag dentro de um post,
   * a própria URL abre o Discover já filtrado.
   */
  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const tag =
      normalizeTag(
        params.get("tag") ?? ""
      );

    if (!tag) {
      return;
    }

    setQ(`#${tag}`);

    void loadTag(tag);

    // Lê a URL somente quando a tela abre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (
      term.startsWith("#")
    ) {
      await openTag(term);
      return;
    }

    setActiveTag("");
    setTagPosts([]);

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

    if (activeTag) {
      setActiveTag("");
      setTagPosts([]);

      window.history.replaceState(
        {},
        "",
        "/discover"
      );
    }

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
      oneOrNull(
        post.track
      );

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

      <div className="discoverContent">
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
          placeholder="música, artista, pessoa ou #tag"
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


      {activeTag && (
        <section
          style={{
            marginTop: 24,
            paddingBottom: 28,
          }}
        >
          <button
            type="button"
            className="pill"
            onClick={clearTag}
            title="Limpar tag"
            style={{
              display:
                "inline-flex",
              alignItems:
                "center",
              gap: 6,
              cursor:
                "pointer",
            }}
          >
            <Hash size={13} />
            {activeTag}
            <X size={12} />
          </button>

          <div
            style={{
              marginTop: 18,
              marginBottom: 14,
            }}
          >
            <h2
              className="sectionTitle"
              style={{
                marginBottom: 5,
              }}
            >
              #{activeTag}
            </h2>

            <p
              className="subtle"
              style={{
                margin: 0,
                fontSize: 12,
              }}
            >
              {tagBusy
                ? "procurando publicações..."
                : `${tagPosts.length} ${
                    tagPosts.length === 1
                      ? "publicação"
                      : "publicações"
                  }`}
            </p>
          </div>

          {!tagBusy &&
            tagPosts.length >
              0 && (
              <div
                className="stack"
              >
                {tagPosts.map(
                  (post) => {
                    const subject =
                      subjectOf(
                        post
                      );

                    const author =
                      one(
                        post.author
                      );

                    if (!subject) {
                      return null;
                    }

                    return (
                      <Link
                        key={
                          post.id
                        }
                        href={`/p/${post.id}`}
                        style={{
                          display:
                            "grid",
                          gridTemplateColumns:
                            "72px minmax(0, 1fr)",
                          gap: 12,
                          padding: 11,
                          color:
                            "inherit",
                          textDecoration:
                            "none",
                          border:
                            "1px solid var(--line)",
                          borderRadius:
                            19,
                          background:
                            "var(--surface-solid)",
                        }}
                      >
                        <div
                          style={{
                            width: 72,
                            height: 72,
                            overflow:
                              "hidden",
                            borderRadius:
                              14,
                            background:
                              "var(--soft-2)",
                          }}
                        >
                          {subject.artwork_url && (
                            <img
                              src={
                                subject.artwork_url
                              }
                              alt=""
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
                          )}
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: 7,
                            }}
                          >
                            <span
                              style={{
                                fontSize:
                                  11,
                                fontWeight:
                                  700,
                                color:
                                  post.type ===
                                  "review"
                                    ? "#4c7e61"
                                    : "#705b99",
                              }}
                            >
                              {post.type ===
                              "review"
                                ? "★ review"
                                : "◎ memory"}
                            </span>

                            {post.type ===
                              "review" &&
                              post.rating && (
                                <span
                                  style={{
                                    marginLeft:
                                      "auto",
                                    fontSize:
                                      11,
                                  }}
                                >
                                  {stars(
                                    post.rating
                                  )}
                                </span>
                              )}
                          </div>

                          <strong
                            style={{
                              display:
                                "block",
                              marginTop: 5,
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                              fontSize:
                                13,
                            }}
                          >
                            {
                              subject.title
                            }{" "}
                            ·{" "}
                            {
                              subject.artist
                            }
                          </strong>

                          <span
                            className="subtle"
                            style={{
                              display:
                                "block",
                              marginTop: 2,
                              fontSize:
                                11,
                            }}
                          >
                            @
                            {
                              author.username
                            }
                          </span>

                          <p
                            style={{
                              margin:
                                "7px 0 0",
                              display:
                                "-webkit-box",
                              WebkitLineClamp:
                                2,
                              WebkitBoxOrient:
                                "vertical",
                              overflow:
                                "hidden",
                              fontSize:
                                12,
                              lineHeight:
                                1.35,
                            }}
                          >
                            {
                              post.body
                            }
                          </p>
                        </div>
                      </Link>
                    );
                  }
                )}
              </div>
            )}

          {!tagBusy &&
            !error &&
            !tagPosts.length && (
              <div className="empty">
                <p>
                  ainda não tem
                  outra publicação
                  com essa tag.
                </p>
              </div>
            )}
        </section>
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
                      <span
                        style={{
                          display:
                            "flex",
                          flex:
                            "0 0 auto",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                        }}
                      >
                        <Avatar
                          profile={
                            profile
                          }
                        />
                      </span>

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

      {!searched && !activeTag && (
        <>
          {loadingDiscover ? (
            <p className="subtle">
              carregando...
            </p>
          ) : (
            <>
              {/*
               * ------------------------------------------
               * TAGS EM ALTA
               * ------------------------------------------
               */}

              {trendingTags.length >
                0 && (
                <section
                  style={{
                    marginTop: 34,
                  }}
                >
                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "end",
                      justifyContent:
                        "space-between",
                      gap: 12,
                      marginBottom:
                        13,
                    }}
                  >
                    <div>
                      <h2
                        style={{
                          margin: 0,
                          fontSize:
                            16,
                          letterSpacing:
                            "-0.02em",
                        }}
                      >
                        rolando por aqui
                      </h2>

                      <p
                        className="subtle"
                        style={{
                          margin:
                            "4px 0 0",
                          fontSize:
                            11,
                        }}
                      >
                        tags mais usadas
                        nos últimos 7 dias
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      gap: 8,
                      overflowX:
                        "auto",
                      paddingBottom:
                        4,
                      scrollbarWidth:
                        "none",
                    }}
                  >
                    {trendingTags.map(
                      (item) => (
                        <button
                          type="button"
                          key={
                            item.label
                          }
                          onClick={() =>
                            void openTag(
                              item.label
                            )
                          }
                          style={{
                            flex:
                              "0 0 auto",
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            gap: 7,
                            minHeight:
                              38,
                            padding:
                              "0 13px",
                            border:
                              "1px solid var(--line)",
                            borderRadius:
                              999,
                            cursor:
                              "pointer",
                            color:
                              "var(--text)",
                            background:
                              "var(--surface-solid)",
                            font:
                              "inherit",
                            fontSize:
                              12,
                            fontWeight:
                              650,
                          }}
                        >
                          <Hash
                            size={13}
                          />

                          <span>
                            {
                              item.label
                            }
                          </span>

                          <small
                            style={{
                              opacity:
                                0.48,
                              fontSize:
                                10,
                              fontWeight:
                                700,
                            }}
                          >
                            {
                              item.count
                            }
                          </small>
                        </button>
                      )
                    )}
                  </div>
                </section>
              )}

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
                          oneOrNull(
                            post.track
                          );

                        if (!track) {
                          return null;
                        }

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
                                "var(--soft-2)",
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
                        const subject =
                          subjectOf(
                            review
                          );

                        const author =
                          one(
                            review.author
                          );

                        if (!subject) {
                          return null;
                        }

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
                                "1px solid var(--line)",

                              borderRadius:
                                20,

                              background:
                                "var(--surface-solid)",

                              boxShadow:
                                "0 10px 32px rgba(0,0,0,.045)",
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
                                    subject.title
                                  }{" "}
                                  ·{" "}
                                  {
                                    subject.artist
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
                            <span
                              style={{
                                display:
                                  "flex",
                                flex:
                                  "0 0 auto",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                              }}
                            >
                              <Avatar
                                profile={
                                  profile
                                }
                              />
                            </span>

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

      </div>
    </main>
  );
}