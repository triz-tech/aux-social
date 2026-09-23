"use client";

import {
  ChevronDown,
  ChevronUp,
  Music2,
  Plus,
  Save,
  Search,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";

import type {
  ResolvedTrack,
} from "@/types";

import { IS_DEMO } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";

type TopTrack = {
  database_id?: string;
  provider: string;
  provider_track_id: string | null;
  title: string;
  artist: string;
  album: string | null;
  artwork_url: string | null;
  source_url: string;
  spotify_url: string | null;
  apple_music_url: string | null;
  deezer_url: string | null;
  duration_ms: number | null;
};

function fromResolved(
  track: ResolvedTrack
): TopTrack {
  return {
    provider: track.provider,
    provider_track_id:
      track.provider_track_id ?? null,
    title: track.title,
    artist: track.artist,
    album: track.album ?? null,
    artwork_url:
      track.artwork_url ?? null,
    source_url: track.source_url,
    spotify_url:
      track.spotify_url ?? null,
    apple_music_url:
      track.apple_music_url ?? null,
    deezer_url:
      track.deezer_url ?? null,
    duration_ms:
      track.duration_ms ?? null,
  };
}

function trackKey(
  track: TopTrack
) {
  if (track.database_id) {
    return track.database_id;
  }

  return [
    track.provider,
    track.provider_track_id ||
      track.source_url ||
      `${track.title}-${track.artist}`,
  ].join(":");
}

export default function TopFiveEditor({
  userId,
}: {
  userId: string | null;
}) {
  const [tracks, setTracks] =
    useState<TopTrack[]>([]);

  const [query, setQuery] =
    useState("");

  const [results, setResults] =
    useState<ResolvedTrack[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [searching, setSearching] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    if (
      IS_DEMO ||
      userId
    ) {
      void load();
    }
  }, [userId]);

  async function load() {
    setLoading(true);
    setError("");

    try {
      if (IS_DEMO) {
        const raw =
          localStorage.getItem(
            "aux-demo-top-five"
          );

        if (raw) {
          setTracks(
            JSON.parse(raw) as TopTrack[]
          );
        }

        return;
      }

      if (!userId) {
        return;
      }

      const supabase =
        createClient();

      const {
        data,
        error: loadError,
      } = await supabase
        .from(
          "profile_top_tracks"
        )
        .select(
          `
            position,
            track:tracks (
              id,
              provider,
              provider_track_id,
              title,
              artist,
              album,
              artwork_url,
              source_url,
              spotify_url,
              apple_music_url,
              deezer_url,
              duration_ms
            )
          `
        )
        .eq("user_id", userId)
        .order(
          "position",
          {
            ascending: true,
          }
        );

      if (loadError) {
        throw loadError;
      }

      type LoadedTrack = {
        id: string;
        provider: string;
        provider_track_id:
          | string
          | null;
        title: string;
        artist: string;
        album:
          | string
          | null;
        artwork_url:
          | string
          | null;
        source_url: string;
        spotify_url:
          | string
          | null;
        apple_music_url:
          | string
          | null;
        deezer_url:
          | string
          | null;
        duration_ms:
          | number
          | null;
      };

      type LoadedRow = {
        position: number;
        track:
          | LoadedTrack
          | LoadedTrack[]
          | null;
      };

      const rows =
        (data ?? []) as unknown as LoadedRow[];

      const loaded =
        rows
          .sort(
            (a, b) =>
              a.position -
              b.position
          )
          .flatMap((row) => {
            const value =
              Array.isArray(row.track)
                ? row.track[0]
                : row.track;

            if (!value) {
              return [];
            }

            return [
              {
                database_id:
                  value.id,
                provider:
                  value.provider,
                provider_track_id:
                  value.provider_track_id,
                title:
                  value.title,
                artist:
                  value.artist,
                album:
                  value.album,
                artwork_url:
                  value.artwork_url,
                source_url:
                  value.source_url,
                spotify_url:
                  value.spotify_url,
                apple_music_url:
                  value.apple_music_url,
                deezer_url:
                  value.deezer_url,
                duration_ms:
                  value.duration_ms,
              } satisfies TopTrack,
            ];
          });

      setTracks(
        loaded.slice(0, 5)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "não consegui carregar seu top."
      );
    } finally {
      setLoading(false);
    }
  }

  async function search() {
    const clean =
      query.trim();

    if (clean.length < 2) {
      setError(
        "digite pelo menos 2 letras."
      );
      return;
    }

    setSearching(true);
    setError("");
    setMessage("");

    try {
      const response =
        await fetch(
          `/api/music/search?q=${encodeURIComponent(
            clean
          )}`
        );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.error ||
            "busca indisponível."
        );
      }

      setResults(
        Array.isArray(
          json.tracks
        )
          ? json.tracks
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "busca indisponível."
      );
    } finally {
      setSearching(false);
    }
  }

  function addTrack(
    result: ResolvedTrack
  ) {
    setError("");
    setMessage("");

    if (tracks.length >= 5) {
      setError(
        "você pode escolher até cinco músicas."
      );
      return;
    }

    const next =
      fromResolved(result);

    const alreadyExists =
      tracks.some(
        (current) =>
          (
            current.provider_track_id &&
            next.provider_track_id &&
            current.provider ===
              next.provider &&
            current.provider_track_id ===
              next.provider_track_id
          ) ||
          (
            current.source_url &&
            current.source_url ===
              next.source_url
          )
      );

    if (alreadyExists) {
      setError(
        "essa música já está no seu top."
      );
      return;
    }

    setTracks(
      (current) => [
        ...current,
        next,
      ]
    );

    setResults([]);
    setQuery("");
  }

  function removeTrack(
    index: number
  ) {
    setTracks(
      (current) =>
        current.filter(
          (_, itemIndex) =>
            itemIndex !== index
        )
    );

    setMessage("");
    setError("");
  }

  function move(
    index: number,
    direction: -1 | 1
  ) {
    const target =
      index + direction;

    if (
      target < 0 ||
      target >= tracks.length
    ) {
      return;
    }

    setTracks(
      (current) => {
        const copy = [
          ...current,
        ];

        [
          copy[index],
          copy[target],
        ] = [
          copy[target],
          copy[index],
        ];

        return copy;
      }
    );

    setMessage("");
  }

  async function ensureTrack(
    supabase:
      ReturnType<
        typeof createClient
      >,
    track: TopTrack
  ) {
    if (track.database_id) {
      return track.database_id;
    }

    if (
      track.provider_track_id
    ) {
      const {
        data: existing,
        error: findError,
      } = await supabase
        .from("tracks")
        .select("id")
        .eq(
          "provider",
          track.provider
        )
        .eq(
          "provider_track_id",
          track.provider_track_id
        )
        .maybeSingle();

      if (findError) {
        throw findError;
      }

      if (existing) {
        return existing.id;
      }
    }

    const {
      data: inserted,
      error: insertError,
    } = await supabase
      .from("tracks")
      .insert({
        provider:
          track.provider,
        provider_track_id:
          track.provider_track_id,
        title:
          track.title,
        artist:
          track.artist,
        album:
          track.album,
        artwork_url:
          track.artwork_url,
        source_url:
          track.source_url,
        spotify_url:
          track.spotify_url,
        apple_music_url:
          track.apple_music_url,
        deezer_url:
          track.deezer_url,
        duration_ms:
          track.duration_ms,
      })
      .select("id")
      .single();

    if (
      insertError &&
      insertError.code ===
        "23505" &&
      track.provider_track_id
    ) {
      const {
        data: raced,
        error: racedError,
      } = await supabase
        .from("tracks")
        .select("id")
        .eq(
          "provider",
          track.provider
        )
        .eq(
          "provider_track_id",
          track.provider_track_id
        )
        .single();

      if (racedError) {
        throw racedError;
      }

      return raced.id;
    }

    if (insertError) {
      throw insertError;
    }

    return inserted.id;
  }

  async function saveTopFive() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (IS_DEMO) {
        localStorage.setItem(
          "aux-demo-top-five",
          JSON.stringify(
            tracks
          )
        );

        setMessage(
          "top salvo."
        );
        return;
      }

      if (!userId) {
        throw new Error(
          "entre novamente."
        );
      }

      const supabase =
        createClient();

      const ids: string[] =
        [];

      for (
        const track of tracks
      ) {
        ids.push(
          await ensureTrack(
            supabase,
            track
          )
        );
      }

      const {
        error: deleteError,
      } = await supabase
        .from(
          "profile_top_tracks"
        )
        .delete()
        .eq(
          "user_id",
          userId
        );

      if (deleteError) {
        throw deleteError;
      }

      if (ids.length) {
        const {
          error: insertError,
        } = await supabase
          .from(
            "profile_top_tracks"
          )
          .insert(
            ids.map(
              (
                trackId,
                index
              ) => ({
                user_id:
                  userId,
                track_id:
                  trackId,
                position:
                  index,
              })
            )
          );

        if (insertError) {
          throw insertError;
        }
      }

      setTracks(
        (
          current
        ) =>
          current.map(
            (
              track,
              index
            ) => ({
              ...track,
              database_id:
                ids[index],
            })
          )
      );

      setMessage(
        "top salvo."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "não consegui salvar seu top."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      style={{
        display: "grid",
        gap: 14,
        padding:
          "22px 0 4px",
        borderTop:
          "1px solid var(--line)",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems:
              "baseline",
            justifyContent:
              "space-between",
            gap: 12,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 21,
              letterSpacing:
                "-0.035em",
            }}
          >
            seu top.
          </h2>

          <span
            className="subtle"
            style={{
              fontSize: 12,
            }}
          >
            {tracks.length}/5
          </span>
        </div>

        <p
          className="subtle"
          style={{
            margin:
              "6px 0 0",
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          escolha até cinco músicas para destacar no seu perfil.
        </p>
      </div>

      {loading ? (
        <p
          className="subtle"
          style={{
            margin: 0,
          }}
        >
          carregando seu top...
        </p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gap: 8,
            }}
          >
            {tracks.map(
              (
                track,
                index
              ) => (
                <div
                  key={trackKey(
                    track
                  )}
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "26px 54px minmax(0, 1fr) auto",
                    alignItems:
                      "center",
                    gap: 10,
                    minHeight: 70,
                    padding: 8,
                    border:
                      "1px solid var(--line)",
                    borderRadius:
                      18,
                    background:
                      "var(--surface-solid)",
                  }}
                >
                  <strong
                    style={{
                      textAlign:
                        "center",
                      fontSize: 14,
                    }}
                  >
                    {index + 1}
                  </strong>

                  <div
                    style={{
                      width: 54,
                      height: 54,
                      overflow:
                        "hidden",
                      borderRadius:
                        13,
                      background:
                        "var(--soft)",
                      display:
                        "grid",
                      placeItems:
                        "center",
                    }}
                  >
                    {track.artwork_url ? (
                      <img
                        src={
                          track.artwork_url
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
                      <Music2
                        size={19}
                      />
                    )}
                  </div>

                  <div
                    style={{
                      minWidth: 0,
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
                        fontSize: 14,
                      }}
                    >
                      {track.title}
                    </strong>

                    <span
                      className="subtle"
                      style={{
                        display:
                          "block",
                        marginTop: 3,
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                        fontSize: 12,
                      }}
                    >
                      {track.artist}
                    </span>
                  </div>

                  <div
                    style={{
                      display:
                        "flex",
                      alignItems:
                        "center",
                      gap: 2,
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Subir"
                      title="Subir"
                      disabled={
                        index === 0
                      }
                      onClick={() =>
                        move(
                          index,
                          -1
                        )
                      }
                      style={iconButton}
                    >
                      <ChevronUp
                        size={16}
                      />
                    </button>

                    <button
                      type="button"
                      aria-label="Descer"
                      title="Descer"
                      disabled={
                        index ===
                        tracks.length -
                          1
                      }
                      onClick={() =>
                        move(
                          index,
                          1
                        )
                      }
                      style={iconButton}
                    >
                      <ChevronDown
                        size={16}
                      />
                    </button>

                    <button
                      type="button"
                      aria-label="Remover"
                      title="Remover"
                      onClick={() =>
                        removeTrack(
                          index
                        )
                      }
                      style={{
                        ...iconButton,
                        color:
                          "#a05a52",
                      }}
                    >
                      <X
                        size={16}
                      />
                    </button>
                  </div>
                </div>
              )
            )}

            {!tracks.length && (
              <div
                style={{
                  padding:
                    "22px 16px",
                  border:
                    "1px dashed var(--line)",
                  borderRadius:
                    18,
                  textAlign:
                    "center",
                }}
              >
                <Music2
                  size={22}
                  style={{
                    opacity:
                      0.35,
                  }}
                />

                <p
                  className="subtle"
                  style={{
                    margin:
                      "8px 0 0",
                    fontSize: 13,
                  }}
                >
                  você ainda não escolheu nenhuma.
                </p>
              </div>
            )}
          </div>

          {tracks.length <
            5 && (
            <div
              style={{
                display:
                  "grid",
                gap: 8,
              }}
            >
              <span
                className="subtle"
                style={{
                  fontSize: 12,
                }}
              >
                adicionar música
              </span>

              <div
                style={{
                  display:
                    "grid",
                  gridTemplateColumns:
                    "minmax(0, 1fr) 46px",
                  gap: 8,
                }}
              >
                <input
                  className="field"
                  value={query}
                  onChange={(
                    event
                  ) =>
                    setQuery(
                      event.target
                        .value
                    )
                  }
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      event.preventDefault();

                      void search();
                    }
                  }}
                  placeholder="música, artista ou álbum"
                />

                <button
                  type="button"
                  className="primary"
                  aria-label="Buscar música"
                  onClick={() =>
                    void search()
                  }
                  disabled={
                    searching
                  }
                  style={{
                    width: 46,
                    minWidth: 46,
                    padding: 0,
                    display:
                      "grid",
                    placeItems:
                      "center",
                  }}
                >
                  <Search
                    size={18}
                  />
                </button>
              </div>

              {searching && (
                <p
                  className="subtle"
                  style={{
                    margin:
                      "4px 0",
                    fontSize: 13,
                  }}
                >
                  procurando...
                </p>
              )}

              {!!results.length && (
                <div
                  style={{
                    display:
                      "grid",
                    gap: 7,
                  }}
                >
                  {results.map(
                    (
                      result,
                      index
                    ) => (
                      <button
                        type="button"
                        key={`${result.provider}-${result.provider_track_id}-${index}`}
                        onClick={() =>
                          addTrack(
                            result
                          )
                        }
                        style={{
                          width:
                            "100%",
                          display:
                            "grid",
                          gridTemplateColumns:
                            "50px minmax(0, 1fr) 32px",
                          alignItems:
                            "center",
                          gap: 10,
                          padding: 8,
                          border:
                            "1px solid var(--line)",
                          borderRadius:
                            16,
                          background:
                            "var(--surface-solid)",
                          color:
                            "inherit",
                          textAlign:
                            "left",
                          cursor:
                            "pointer",
                        }}
                      >
                        <div
                          style={{
                            width:
                              50,
                            height:
                              50,
                            borderRadius:
                              12,
                            overflow:
                              "hidden",
                            background:
                              "var(--soft)",
                            display:
                              "grid",
                            placeItems:
                              "center",
                          }}
                        >
                          {result.artwork_url ? (
                            <img
                              src={
                                result.artwork_url
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
                            <Music2
                              size={
                                18
                              }
                            />
                          )}
                        </div>

                        <div
                          style={{
                            minWidth:
                              0,
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
                              fontSize:
                                14,
                            }}
                          >
                            {
                              result.title
                            }
                          </strong>

                          <span
                            className="subtle"
                            style={{
                              display:
                                "block",
                              marginTop:
                                3,
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                              fontSize:
                                12,
                            }}
                          >
                            {
                              result.artist
                            }
                          </span>
                        </div>

                        <Plus
                          size={18}
                        />
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          {message && (
            <div className="success">
              {message}
            </div>
          )}

          <button
            type="button"
            className="secondary"
            disabled={saving}
            onClick={() =>
              void saveTopFive()
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
            <Save size={17} />

            {saving
              ? "salvando..."
              : "salvar top"}
          </button>
        </>
      )}
    </section>
  );
}

const iconButton = {
  width: 30,
  height: 30,
  padding: 0,
  border: 0,
  borderRadius: 10,
  background:
    "transparent",
  color: "inherit",
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
} as const;
