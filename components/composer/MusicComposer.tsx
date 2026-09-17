"use client";

import {
  Camera,
  Images,
  Link2,
  Search,
} from "lucide-react";
import {
  useEffect,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import type {
  Post,
  PostMedia,
  PostType,
  Profile,
  ResolvedTrack,
} from "@/types";

import MusicRecognition from "@/components/music/MusicRecognition";
import TrackPreview from "@/components/music/TrackPreview";
import { RatingInput } from "@/components/review/RatingStars";
import { shareStoryCard } from "@/components/share/story";

import { IS_DEMO } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { extractSharedUrl } from "@/lib/utils";

export default function MusicComposer() {
  const params = useSearchParams();
  const router = useRouter();

  const initial = (params.get("mode") || "link") as
    | "link"
    | "search"
    | "listen";

  const [mode, setMode] = useState(initial);

  const [track, setTrack] =
    useState<ResolvedTrack | null>(null);

  const [postType, setPostType] =
    useState<PostType | null>(null);

  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");

  const [results, setResults] = useState<
    ResolvedTrack[]
  >([]);

  const [body, setBody] = useState("");
  const [rating, setRating] = useState(4.5);
  const [trend, setTrend] = useState("");

  const [photos, setPhotos] = useState<File[]>(
    []
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [published, setPublished] = useState<
    string | null
  >(null);

  const [publishedPost, setPublishedPost] =
    useState<Post | null>(null);

  const [shareMessage, setShareMessage] =
    useState("");

  /*
   * ========================================================
   * LINK RECEBIDO POR SHARE TARGET
   * ========================================================
   */

  useEffect(() => {
    const shared = extractSharedUrl(
      `${params.get("url") || ""} ${
        params.get("text") || ""
      }`
    );

    if (shared) {
      setUrl(shared);
      setMode("link");

      void resolve(shared);
    }
    // Executar somente na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * ========================================================
   * RESOLVER LINK DE MÚSICA
   * ========================================================
   */

  async function resolve(value = url) {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        "/api/music/resolve",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            url: value,
          }),
        }
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error);
      }

      setTrack(json.track);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "não encontrei essa música automaticamente."
      );
    } finally {
      setBusy(false);
    }
  }

  /*
   * ========================================================
   * BUSCAR MÚSICA
   * ========================================================
   */

  async function search() {
    if (query.trim().length < 2) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `/api/music/search?q=${encodeURIComponent(
          query
        )}`
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error);
      }

      setResults(json.tracks);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "busca indisponível."
      );
    } finally {
      setBusy(false);
    }
  }

  /*
   * ========================================================
   * FOTOS DA MEMORY
   * ========================================================
   */

  function chooseFiles(list: FileList | null) {
    if (!list) return;

    const acceptedFiles = Array.from(list)
      .filter(
        (file) =>
          file.type.startsWith("image/") &&
          file.size <= 10_000_000
      )
      .slice(0, 6);

    setPhotos((current) =>
      [...current, ...acceptedFiles].slice(0, 6)
    );
  }

  /*
   * ========================================================
   * PUBLICAR REVIEW / MEMORY
   * ========================================================
   */

  async function publish() {
    if (
      !track ||
      !postType ||
      !body.trim()
    ) {
      setError(
        "Falta escrever o que ficou para você."
      );

      return;
    }

    if (
      postType === "review" &&
      !rating
    ) {
      setError(
        "Dê uma nota para a música."
      );

      return;
    }

    if (
      postType === "memory" &&
      !photos.length
    ) {
      setError(
        "Adicione pelo menos uma fotografia."
      );

      return;
    }

    setBusy(true);
    setError("");
    setShareMessage("");

    try {
      /*
       * ----------------------------
       * DEMO MODE
       * ----------------------------
       */

      if (IS_DEMO) {
        const id = `demo-${Date.now()}`;

        localStorage.setItem(
          "aux-demo-last",
          JSON.stringify({
            id,
            track,
            postType,
            body,
            rating,
            trend,
            photos: photos.map(
              (file) => file.name
            ),
          })
        );

        setPublished(id);

        return;
      }

      /*
       * ----------------------------
       * USUÁRIO
       * ----------------------------
       */

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(
          `/login?next=${encodeURIComponent(
            location.pathname +
              location.search
          )}`
        );

        return;
      }

      /*
       * ----------------------------
       * TRACK
       * ----------------------------
       */

      let trackId: string;

      if (track.provider_track_id) {
        const {
          data,
          error: trackError,
        } = await supabase
          .from("tracks")
          .upsert(
            {
              provider: track.provider,

              provider_track_id:
                track.provider_track_id,

              title: track.title,
              artist: track.artist,
              album: track.album,

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
            },
            {
              onConflict:
                "provider,provider_track_id",
            }
          )
          .select("id")
          .single();

        if (trackError) {
          throw trackError;
        }

        trackId = data.id;
      } else {
        const {
          data,
          error: trackError,
        } = await supabase
          .from("tracks")
          .insert({
            provider: track.provider,
            title: track.title,
            artist: track.artist,
            album: track.album,

            artwork_url:
              track.artwork_url,

            source_url:
              track.source_url,
          })
          .select("id")
          .single();

        if (trackError) {
          throw trackError;
        }

        trackId = data.id;
      }

      /*
       * ----------------------------
       * POST
       * ----------------------------
       */

      const {
        data: post,
        error: postError,
      } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          track_id: trackId,

          type: postType,

          body: body.trim(),

          rating:
            postType === "review"
              ? rating
              : null,

          trend:
            trend.trim() || null,

          visibility: "public",
        })
        .select("id,created_at")
        .single();

      if (postError) {
        throw postError;
      }

      /*
       * ----------------------------
       * MEMORY MEDIA
       * ----------------------------
       */

      const uploadedMedia: PostMedia[] = [];

      if (postType === "memory") {
        for (
          let index = 0;
          index < photos.length;
          index++
        ) {
          const file = photos[index];

          const extension = (
            file.name
              .split(".")
              .pop() || "jpg"
          ).replace(
            /[^a-z0-9]/gi,
            ""
          );

          const storagePath =
            `${user.id}/` +
            `${crypto.randomUUID()}.` +
            `${extension}`;

          /*
           * Upload da foto
           */

          const {
            error: uploadError,
          } = await supabase.storage
            .from("memories")
            .upload(
              storagePath,
              file,
              {
                contentType:
                  file.type,

                upsert: false,
              }
            );

          if (uploadError) {
            throw uploadError;
          }

          /*
           * Registro no post_media
           */

          const {
            data: mediaRow,
            error: mediaError,
          } = await supabase
            .from("post_media")
            .insert({
              post_id: post.id,

              storage_path:
                storagePath,

              position: index,
            })
            .select(
              `
                id,
                storage_path,
                position,
                width,
                height,
                aspect_ratio
              `
            )
            .single();

          if (mediaError) {
            throw mediaError;
          }

          /*
           * URL pública da foto
           */

          const publicUrl =
            supabase.storage
              .from("memories")
              .getPublicUrl(
                storagePath
              ).data.publicUrl;

          uploadedMedia.push({
            ...mediaRow,
            public_url: publicUrl,
          });
        }
      }

      /*
       * ----------------------------
       * PERFIL DO AUTOR
       * ----------------------------
       */

      const {
        data: profile,
        error: profileError,
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
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      /*
       * ----------------------------
       * POST COMPLETO
       *
       * Usado imediatamente pelo
       * Story Card pós-publicação.
       * ----------------------------
       */

      const createdPost: Post = {
        id: post.id,

        type: postType,

        body: body.trim(),

        rating:
          postType === "review"
            ? rating
            : null,

        trend:
          trend.trim() || null,

        created_at:
          post.created_at ??
          new Date().toISOString(),

        author:
          profile as Profile,

        track: {
          id: trackId,

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
        },

        media: uploadedMedia,

        counts: {
          likes: 0,
          comments: 0,
          reposts: 0,

          liked: false,
          reposted: false,
        },
      };

      /*
       * ----------------------------
       * PUBLICADO
       * ----------------------------
       */

      setPublishedPost(
        createdPost
      );

      setPublished(post.id);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não consegui publicar."
      );
    } finally {
      setBusy(false);
    }
  }

  /*
   * ========================================================
   * STORY PÓS-PUBLICAÇÃO
   * ========================================================
   */

  async function sharePublishedStory() {
    if (!publishedPost) {
      return;
    }

    setBusy(true);
    setShareMessage("");

    try {
      const result =
        await shareStoryCard(
          publishedPost
        );

      if (result === "downloaded") {
        setShareMessage(
          "Story Card salvo."
        );
      }

      if (result === "shared") {
        setShareMessage(
          "pronto para compartilhar."
        );
      }
    } catch {
      setShareMessage(
        "não consegui gerar o Story Card."
      );
    } finally {
      setBusy(false);
    }
  }

  /*
   * ========================================================
   * TELA DE SUCESSO
   * ========================================================
   */

  if (published) {
    return (
      <div className="empty">
        <div
          style={{
            fontSize: 58,
          }}
        >
          ✓
        </div>

        <h1 className="pageTitle">
          publicado.
        </h1>

        <div
          className="stack"
          style={{
            maxWidth: 360,
            margin: "auto",
          }}
        >
          <button
            className="primary"
            disabled={
              !publishedPost ||
              busy
            }
            onClick={
              sharePublishedStory
            }
          >
            {busy
              ? "criando Story..."
              : "compartilhar no Story"}
          </button>

          <button
            className="secondary"
            onClick={() =>
              router.push(
                `/p/${published}`
              )
            }
          >
            ver publicação
          </button>

          <button
            className="secondary"
            onClick={() =>
              router.push("/")
            }
          >
            voltar ao feed
          </button>

          {shareMessage && (
            <div className="success">
              {shareMessage}
            </div>
          )}
        </div>
      </div>
    );
  }

  /*
   * ========================================================
   * COMPOSER
   * ========================================================
   */

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          aux.
        </div>

        <span className="pill">
          nova publicação
        </span>
      </div>

      {!track ? (
        <>
          {/*
           * -----------------------
           * MODOS
           * -----------------------
           */}

          <div className="tabs">
            <button
              className={`tab ${
                mode === "listen"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setMode("listen")
              }
            >
              ouvir
            </button>

            <button
              className={`tab ${
                mode === "link"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setMode("link")
              }
            >
              link
            </button>

            <button
              className={`tab ${
                mode === "search"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                setMode("search")
              }
            >
              buscar
            </button>
          </div>

          {/*
           * -----------------------
           * O QUE TÁ TOCANDO?
           * -----------------------
           */}

          {mode === "listen" && (
            <MusicRecognition
              onFound={setTrack}
            />
          )}

          {/*
           * -----------------------
           * COLAR LINK
           * -----------------------
           */}

          {mode === "link" && (
            <div className="stack">
              <h1 className="pageTitle">
                cole a música.
              </h1>

              <div className="searchbar">
                <input
                  className="field"
                  value={url}
                  onChange={(event) =>
                    setUrl(
                      event.target
                        .value
                    )
                  }
                  placeholder="Spotify, Apple Music ou Deezer"
                  inputMode="url"
                />

                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    resolve()
                  }
                >
                  <Link2 size={18} />
                </button>
              </div>
            </div>
          )}

          {/*
           * -----------------------
           * BUSCAR
           * -----------------------
           */}

          {mode === "search" && (
            <div>
              <h1 className="pageTitle">
                qual foi?
              </h1>

              <div className="searchbar">
                <input
                  className="field"
                  value={query}
                  onChange={(event) =>
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
                      void search();
                    }
                  }}
                  placeholder="música, artista ou álbum"
                />

                <button
                  className="primary"
                  onClick={() =>
                    void search()
                  }
                  disabled={busy}
                >
                  <Search size={18} />
                </button>
              </div>

              <div className="results">
                {results.map(
                  (
                    result,
                    index
                  ) => (
                    <TrackPreview
                      key={`${result.provider}-${result.provider_track_id}-${index}`}
                      track={
                        result
                      }
                      onClick={() =>
                        setTrack(
                          result
                        )
                      }
                    />
                  )
                )}
              </div>
            </div>
          )}

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
        </>
      ) : !postType ? (
        /*
         * =============================================
         * REVIEW OU MEMORY?
         * =============================================
         */

        <div>
          <h1 className="pageTitle">
            o que ficou?
          </h1>

          <TrackPreview
            track={track}
          />

          <div
            style={{
              height: 18,
            }}
          />

          <button
            className="choice"
            onClick={() =>
              setPostType("review")
            }
          >
            <span className="choiceIcon">
              ★
            </span>

            <div>
              <strong>
                Review
              </strong>

              <span>
                dar sua nota e
                dizer o que achou
              </span>
            </div>
          </button>

          <button
            className="choice"
            onClick={() =>
              setPostType("memory")
            }
          >
            <span className="choiceIcon">
              ◎
            </span>

            <div>
              <strong>
                Memory
              </strong>

              <span>
                guardar a música
                junto do momento
              </span>
            </div>
          </button>

          <button
            className="secondary"
            style={{
              marginTop: 12,
            }}
            onClick={() =>
              setTrack(null)
            }
          >
            trocar música
          </button>
        </div>
      ) : (
        /*
         * =============================================
         * EDITOR DO POST
         * =============================================
         */

        <div className="stack">
          <h1 className="pageTitle">
            {postType === "review"
              ? "o que ela fez com você?"
              : "guarde isso."}
          </h1>

          <TrackPreview
            track={track}
          />

          {/*
           * -----------------------
           * REVIEW
           * -----------------------
           */}

          {postType ===
            "review" && (
            <>
              <label>
                nota
              </label>

              <RatingInput
                value={rating}
                onChange={
                  setRating
                }
              />

              <input
                className="field"
                value={trend}
                onChange={(
                  event
                ) =>
                  setTrend(
                    event.target
                      .value
                  )
                }
                maxLength={40}
                placeholder="tag opcional · ex: late night"
              />
            </>
          )}

          {/*
           * -----------------------
           * MEMORY
           * -----------------------
           */}

          {postType ===
            "memory" && (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                }}
              >
                <label
                  className="secondary"
                  style={{
                    flex: 1,
                    textAlign:
                      "center",
                  }}
                >
                  <Camera
                    size={18}
                    style={{
                      verticalAlign:
                        "middle",
                    }}
                  />{" "}
                  tirar foto

                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(
                      event
                    ) =>
                      chooseFiles(
                        event.target
                          .files
                      )
                    }
                  />
                </label>

                <label
                  className="secondary"
                  style={{
                    flex: 1,
                    textAlign:
                      "center",
                  }}
                >
                  <Images
                    size={18}
                    style={{
                      verticalAlign:
                        "middle",
                    }}
                  />{" "}
                  galeria

                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(
                      event
                    ) =>
                      chooseFiles(
                        event.target
                          .files
                      )
                    }
                  />
                </label>
              </div>

              {photos.length >
                0 && (
                <div className="photoGrid">
                  {photos.map(
                    (
                      file,
                      index
                    ) => (
                      <img
                        key={`${file.name}-${index}`}
                        className="photoThumb"
                        src={URL.createObjectURL(
                          file
                        )}
                        alt={`Foto ${
                          index + 1
                        }`}
                      />
                    )
                  )}
                </div>
              )}
            </>
          )}

          {/*
           * -----------------------
           * TEXTO
           * -----------------------
           */}

          <textarea
            className="field"
            value={body}
            onChange={(
              event
            ) =>
              setBody(
                event.target.value
              )
            }
            maxLength={4000}
            placeholder={
              postType === "review"
                ? "escreva sua review"
                : "o que estava acontecendo quando ela tocou?"
            }
          />

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <button
            className="primary"
            disabled={busy}
            onClick={() =>
              void publish()
            }
          >
            {busy
              ? "publicando..."
              : `Publicar ${postType}`}
          </button>

          <button
            className="secondary"
            onClick={() =>
              setPostType(null)
            }
          >
            voltar
          </button>
        </div>
      )}
    </div>
  );
}