"use client";

import {
  Camera,
  ClipboardPaste,
  Images,
  Link2,
  Hash,
  Search,
  Star,
  ImagePlus,
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
  ResolvedAlbum,
  ResolvedTrack,
} from "@/types";

import MusicRecognition from "@/components/music/MusicRecognition";
import TrackPreview from "@/components/music/TrackPreview";
import { RatingInput } from "@/components/review/RatingStars";
import { shareStoryCard } from "@/components/share/story";

import { IS_DEMO } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { extractSharedUrl } from "@/lib/utils";

type TagSuggestion = {
  label: string;
  count: number;
};

type SearchTarget =
  | "track"
  | "album";

function AlbumPreview({
  album,
  onClick,
}: {
  album: ResolvedAlbum;
  onClick?: () => void;
}) {
  const year =
    album.release_date
      ? album.release_date.slice(
          0,
          4
        )
      : null;

  const content = (
    <>
      <div
        style={{
          width: 58,
          height: 58,
          flex: "0 0 58px",
          overflow: "hidden",
          borderRadius: 12,
          background:
            "var(--soft)",
        }}
      >
        {album.artwork_url ? (
          <img
            src={album.artwork_url}
            alt={`Capa de ${album.title}`}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              objectFit: "cover",
            }}
          />
        ) : null}
      </div>

      <div
        style={{
          minWidth: 0,
          flex: 1,
        }}
      >
        <strong
          style={{
            display: "block",
            overflow: "hidden",
            textOverflow:
              "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 14,
          }}
        >
          {album.title}
        </strong>

        <span
          className="subtle"
          style={{
            display: "block",
            marginTop: 3,
            overflow: "hidden",
            textOverflow:
              "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {album.artist}
        </span>

        <span
          className="subtle"
          style={{
            display: "block",
            marginTop: 4,
            fontSize: 10,
          }}
        >
          álbum
          {year
            ? ` · ${year}`
            : ""}
          {album.total_tracks
            ? ` · ${album.total_tracks} faixas`
            : ""}
        </span>
      </div>
    </>
  );

  if (!onClick) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          padding: 10,
          border:
            "1px solid var(--line)",
          borderRadius: 16,
          background:
            "var(--card)",
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: 10,
        border:
          "1px solid var(--line)",
        borderRadius: 16,
        background:
          "var(--card)",
        color: "var(--text)",
        font: "inherit",
        textAlign: "left",
        cursor: "pointer",
      }}
    >
      {content}
    </button>
  );
}

function cleanTag(
  value: string
) {
  return value
    .trim()
    .replace(/^#/, "")
    .trim();
}

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

  const [album, setAlbum] =
    useState<ResolvedAlbum | null>(null);

  const [
    searchTarget,
    setSearchTarget,
  ] = useState<SearchTarget>(
    "track"
  );

  const [postType, setPostType] =
    useState<PostType | null>(null);

  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");

  const [results, setResults] = useState<
    ResolvedTrack[]
  >([]);

  const [
    albumResults,
    setAlbumResults,
  ] = useState<ResolvedAlbum[]>(
    []
  );

  const [body, setBody] = useState("");
  const [rating, setRating] = useState(4.5);
  const [trend, setTrend] = useState("");

  const [
    tagSuggestions,
    setTagSuggestions,
  ] = useState<TagSuggestion[]>(
    []
  );

  const [
    tagFocused,
    setTagFocused,
  ] = useState(false);

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
   * TAGS DA COMUNIDADE
   * ========================================================
   *
   * Carrega tags já usadas em publicações públicas.
   * Isso evita criar "late night", "Late Night" e
   * "#late night" como ideias visualmente separadas.
   */

  useEffect(() => {
    if (!postType) {
      return;
    }

    if (IS_DEMO) {
      setTagSuggestions([]);
      return;
    }

    let active = true;

    async function loadTags() {
      const supabase =
        createClient();

      const {
        data,
        error: tagsError,
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
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(300);

      if (
        tagsError ||
        !active
      ) {
        return;
      }

      const map =
        new Map<
          string,
          TagSuggestion
        >();

      (data ?? []).forEach(
        (row) => {
          const label =
            cleanTag(
              row.trend ?? ""
            );

          if (!label) {
            return;
          }

          const key =
            label.toLowerCase();

          const current =
            map.get(key);

          map.set(key, {
            label:
              current?.label ??
              label,
            count:
              (current?.count ??
                0) + 1,
          });
        }
      );

      setTagSuggestions(
        [...map.values()].sort(
          (a, b) =>
            b.count -
            a.count ||
            a.label.localeCompare(
              b.label
            )
        )
      );
    }

    void loadTags();

    return () => {
      active = false;
    };
  }, [postType]);

  const tagTerm =
    cleanTag(
      trend
    ).toLowerCase();

  const visibleTags =
    tagSuggestions
      .filter((item) => {
        if (!tagTerm) {
          return true;
        }

        return item.label
          .toLowerCase()
          .includes(tagTerm);
      })
      .slice(0, 6);

  /*
   * ========================================================
   * RESOLVER LINK DE MÚSICA / ÁLBUM
   * ========================================================
   */

  async function pasteMusicLink() {
    setError("");

    try {
      if (
        !navigator.clipboard
          ?.readText
      ) {
        throw new Error(
          "Seu navegador não liberou o acesso ao copiar e colar."
        );
      }

      const text =
        (
          await navigator
            .clipboard
            .readText()
        ).trim();

      const shared =
        extractSharedUrl(
          text
        );

      if (!shared) {
        throw new Error(
          "Não encontrei um link de música no que você copiou."
        );
      }

      setUrl(shared);

      await resolve(
        shared
      );
    } catch (error) {
      if (
        error instanceof
          DOMException &&
        (
          error.name ===
            "NotAllowedError" ||
          error.name ===
            "SecurityError"
        )
      ) {
        setError(
          "Não consegui ler o link copiado. Cole no campo abaixo."
        );

        return;
      }

      setError(
        error instanceof Error
          ? error.message
          : "Não consegui usar o link copiado."
      );
    }
  }

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

      if (
        json.kind === "album" &&
        json.album
      ) {
        setAlbum(
          json.album
        );

        setTrack(
          null
        );

        /*
         * Álbum entra direto em Review.
         * Memory continua exclusiva de música.
         */
        setPostType(
          "review"
        );

        return;
      }

      if (
        json.kind === "track" &&
        json.track
      ) {
        setTrack(
          json.track
        );

        setAlbum(
          null
        );

        /*
         * Música mantém o fluxo existente:
         * depois a pessoa escolhe Review ou Memory.
         */
        setPostType(
          null
        );

        return;
      }

      throw new Error(
        "Não consegui identificar se esse link é de uma música ou álbum."
      );
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
    const clean =
      query.trim();

    if (clean.length < 2) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      const suffix =
        searchTarget === "album"
          ? "&type=album"
          : "";

      const response = await fetch(
        `/api/music/search?q=${encodeURIComponent(
          clean
        )}${suffix}`
      );

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error);
      }

      if (
        searchTarget === "album"
      ) {
        setResults([]);

        setAlbumResults(
          Array.isArray(
            json.albums
          )
            ? json.albums
            : []
        );

        return;
      }

      setAlbumResults([]);

      setResults(
        Array.isArray(
          json.tracks
        )
          ? json.tracks
          : []
      );
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
    const hasSubject =
      Boolean(track || album);

    if (
      !hasSubject ||
      !postType ||
      !body.trim()
    ) {
      setError(
        "Falta escrever o que ficou para você."
      );

      return;
    }

    /*
     * Álbum só pode gerar Review.
     * A constraint do banco também protege essa regra.
     */
    if (
      album &&
      postType !== "review"
    ) {
      setError(
        "Álbuns podem ser publicados como Review."
      );

      return;
    }

    if (
      postType === "review" &&
      !rating
    ) {
      setError(
        album
          ? "Dê uma nota para o álbum."
          : "Dê uma nota para a música."
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
        const id =
          `demo-${Date.now()}`;

        localStorage.setItem(
          "aux-demo-last",
          JSON.stringify({
            id,
            track,
            album,
            postType,
            body,
            rating,
            trend,
            photos:
              photos.map(
                (file) =>
                  file.name
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

      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        router.push(
          `/login?next=${encodeURIComponent(
            location.pathname +
              location.search
          )}`
        );

        return;
      }

      let trackId:
        | string
        | null = null;

      let albumId:
        | string
        | null = null;

      /*
       * ----------------------------
       * ALBUM
       * ----------------------------
       */

      if (album) {
        if (
          album.provider_album_id
        ) {
          const {
            data:
              existingAlbum,
            error:
              findAlbumError,
          } =
            await supabase
              .from("albums")
              .select("id")
              .eq(
                "provider",
                album.provider
              )
              .eq(
                "provider_album_id",
                album.provider_album_id
              )
              .maybeSingle();

          if (
            findAlbumError
          ) {
            throw new Error(
              `albums: ${findAlbumError.message}`
            );
          }

          if (
            existingAlbum
          ) {
            albumId =
              existingAlbum.id;
          } else {
            const {
              data:
                newAlbum,
              error:
                insertAlbumError,
            } =
              await supabase
                .from(
                  "albums"
                )
                .insert({
                  provider:
                    album.provider,

                  provider_album_id:
                    album.provider_album_id,

                  title:
                    album.title,

                  artist:
                    album.artist,

                  artwork_url:
                    album.artwork_url,

                  source_url:
                    album.source_url,

                  spotify_url:
                    album.spotify_url ??
                    null,

                  apple_music_url:
                    album.apple_music_url ??
                    null,

                  deezer_url:
                    album.deezer_url ??
                    null,

                  release_date:
                    album.release_date ??
                    null,

                  total_tracks:
                    album.total_tracks ??
                    null,
                })
                .select(
                  "id"
                )
                .single();

            if (
              insertAlbumError &&
              insertAlbumError.code ===
                "23505"
            ) {
              const {
                data:
                  racedAlbum,
                error:
                  racedAlbumError,
              } =
                await supabase
                  .from(
                    "albums"
                  )
                  .select(
                    "id"
                  )
                  .eq(
                    "provider",
                    album.provider
                  )
                  .eq(
                    "provider_album_id",
                    album.provider_album_id
                  )
                  .single();

              if (
                racedAlbumError
              ) {
                throw new Error(
                  `albums: ${racedAlbumError.message}`
                );
              }

              albumId =
                racedAlbum.id;
            } else if (
              insertAlbumError
            ) {
              throw new Error(
                `albums: ${insertAlbumError.message}`
              );
            } else {
              albumId =
                newAlbum.id;
            }
          }
        } else {
          /*
           * Fallback para providers que eventualmente
           * não devolverem um id externo.
           */
          const {
            data:
              newAlbum,
            error:
              albumError,
          } =
            await supabase
              .from("albums")
              .insert({
                provider:
                  album.provider,

                provider_album_id:
                  null,

                title:
                  album.title,

                artist:
                  album.artist,

                artwork_url:
                  album.artwork_url,

                source_url:
                  album.source_url,

                spotify_url:
                  album.spotify_url ??
                  null,

                apple_music_url:
                  album.apple_music_url ??
                  null,

                deezer_url:
                  album.deezer_url ??
                  null,

                release_date:
                  album.release_date ??
                  null,

                total_tracks:
                  album.total_tracks ??
                  null,
              })
              .select("id")
              .single();

          if (albumError) {
            throw new Error(
              `albums: ${albumError.message}`
            );
          }

          albumId =
            newAlbum.id;
        }
      }

      /*
       * ----------------------------
       * TRACK
       * ----------------------------
       */

      if (track) {
        /*
         * A mesma música pode aparecer em quantas publicações
         * forem necessárias. `tracks` guarda uma única ficha da
         * música; cada Review/Memory cria um novo post apontando
         * para essa ficha.
         */

        if (
          track.provider_track_id
        ) {
          const {
            data:
              existingTrack,
            error:
              findTrackError,
          } =
            await supabase
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

          if (
            findTrackError
          ) {
            throw new Error(
              `tracks: ${findTrackError.message}`
            );
          }

          if (
            existingTrack
          ) {
            trackId =
              existingTrack.id;
          } else {
            const {
              data:
                newTrack,
              error:
                insertTrackError,
            } =
              await supabase
                .from(
                  "tracks"
                )
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
                    track.spotify_url ??
                    null,

                  apple_music_url:
                    track.apple_music_url ??
                    null,

                  deezer_url:
                    track.deezer_url ??
                    null,

                  duration_ms:
                    track.duration_ms ??
                    null,
                })
                .select(
                  "id"
                )
                .single();

            if (
              insertTrackError &&
              insertTrackError.code ===
                "23505"
            ) {
              const {
                data:
                  racedTrack,
                error:
                  racedTrackError,
              } =
                await supabase
                  .from(
                    "tracks"
                  )
                  .select(
                    "id"
                  )
                  .eq(
                    "provider",
                    track.provider
                  )
                  .eq(
                    "provider_track_id",
                    track.provider_track_id
                  )
                  .single();

              if (
                racedTrackError
              ) {
                throw new Error(
                  `tracks: ${racedTrackError.message}`
                );
              }

              trackId =
                racedTrack.id;
            } else if (
              insertTrackError
            ) {
              throw new Error(
                `tracks: ${insertTrackError.message}`
              );
            } else {
              trackId =
                newTrack.id;
            }
          }
        } else {
          const {
            data:
              newTrack,
            error:
              trackError,
          } =
            await supabase
              .from("tracks")
              .insert({
                provider:
                  track.provider,

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
              })
              .select("id")
              .single();

          if (trackError) {
            throw new Error(
              `tracks: ${trackError.message}`
            );
          }

          trackId =
            newTrack.id;
        }
      }

      /*
       * ----------------------------
       * POST
       * ----------------------------
       */

      const {
        data: post,
        error: postError,
      } =
        await supabase
          .from("posts")
          .insert({
            user_id:
              user.id,

            track_id:
              trackId,

            album_id:
              albumId,

            type:
              postType,

            body:
              body.trim(),

            rating:
              postType ===
              "review"
                ? rating
                : null,

            trend:
              cleanTag(
                trend
              ) || null,

            visibility:
              "public",
          })
          .select(
            "id,created_at"
          )
          .single();

      if (postError) {
        throw new Error(
          `posts: ${postError.message}`
        );
      }

      /*
       * ----------------------------
       * MEMORY MEDIA
       * ----------------------------
       */

      const uploadedMedia:
        PostMedia[] = [];

      if (
        postType ===
        "memory"
      ) {
        for (
          let index = 0;
          index <
          photos.length;
          index++
        ) {
          const file =
            photos[index];

          const extension =
            (
              file.name
                .split(".")
                .pop() ||
              "jpg"
            ).replace(
              /[^a-z0-9]/gi,
              ""
            );

          const storagePath =
            `${user.id}/` +
            `${crypto.randomUUID()}.` +
            `${extension}`;

          const {
            error:
              uploadError,
          } =
            await supabase
              .storage
              .from(
                "memories"
              )
              .upload(
                storagePath,
                file,
                {
                  contentType:
                    file.type,

                  upsert:
                    false,
                }
              );

          if (
            uploadError
          ) {
            throw new Error(
              `storage: ${uploadError.message}`
            );
          }

          const {
            data:
              mediaRow,
            error:
              mediaError,
          } =
            await supabase
              .from(
                "post_media"
              )
              .insert({
                post_id:
                  post.id,

                storage_path:
                  storagePath,

                position:
                  index,
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

          if (
            mediaError
          ) {
            throw new Error(
              `post_media: ${mediaError.message}`
            );
          }

          const publicUrl =
            supabase.storage
              .from(
                "memories"
              )
              .getPublicUrl(
                storagePath
              ).data
              .publicUrl;

          uploadedMedia.push({
            ...mediaRow,

            public_url:
              publicUrl,
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
        error:
          profileError,
      } =
        await supabase
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
          .eq(
            "id",
            user.id
          )
          .single();

      if (
        profileError
      ) {
        throw new Error(
          `profile: ${profileError.message}`
        );
      }

      /*
       * ----------------------------
       * POST COMPLETO
       *
       * Story Card ainda usa post.track para a camada visual.
       * Em Review de álbum entregamos ali o mesmo adapter que
       * o Feed usa, sem criar track falsa no banco.
       * ----------------------------
       */

      if (
        album &&
        albumId
      ) {
        const albumRecord = {
          id:
            albumId,

          provider:
            album.provider,

          provider_album_id:
            album.provider_album_id,

          title:
            album.title,

          artist:
            album.artist,

          artwork_url:
            album.artwork_url,

          source_url:
            album.source_url,

          spotify_url:
            album.spotify_url ??
            null,

          apple_music_url:
            album.apple_music_url ??
            null,

          deezer_url:
            album.deezer_url ??
            null,

          release_date:
            album.release_date ??
            null,

          total_tracks:
            album.total_tracks ??
            null,
        };

        const createdPost:
          Post = {
            id:
              post.id,

            type:
              "review",

            body:
              body.trim(),

            rating,

            trend:
              cleanTag(
                trend
              ) || null,

            created_at:
              post.created_at ??
              new Date()
                .toISOString(),

            author:
              profile as Profile,

            subject_kind:
              "album",

            album:
              albumRecord,

            track: {
              id:
                albumId,

              provider:
                album.provider,

              provider_track_id:
                null,

              title:
                album.title,

              artist:
                album.artist,

              album:
                album.title,

              artwork_url:
                album.artwork_url,

              source_url:
                album.source_url,

              spotify_url:
                album.spotify_url,

              apple_music_url:
                album.apple_music_url,

              deezer_url:
                album.deezer_url,

              duration_ms:
                null,
            },

            media: [],

            counts: {
              likes: 0,
              comments: 0,
              reposts: 0,

              liked:
                false,

              reposted:
                false,
            },
          };

        setPublishedPost(
          createdPost
        );
      } else if (
        track &&
        trackId
      ) {
        const createdPost:
          Post = {
            id:
              post.id,

            type:
              postType,

            body:
              body.trim(),

            rating:
              postType ===
              "review"
                ? rating
                : null,

            trend:
              cleanTag(
                trend
              ) || null,

            created_at:
              post.created_at ??
              new Date()
                .toISOString(),

            author:
              profile as Profile,

            subject_kind:
              "track",

            album:
              null,

            track: {
              id:
                trackId,

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

            media:
              uploadedMedia,

            counts: {
              likes: 0,
              comments: 0,
              reposts: 0,

              liked:
                false,

              reposted:
                false,
            },
          };

        setPublishedPost(
          createdPost
        );
      } else {
        throw new Error(
          "Não consegui identificar a música ou o álbum publicado."
        );
      }

      setPublished(
        post.id
      );
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

      {!track && !album ? (
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

              <button
                type="button"
                className="secondary"
                onClick={() =>
                  void pasteMusicLink()
                }
                disabled={busy}
                style={{
                  width: "100%",
                  marginBottom: 12,
                  display: "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  gap: 8,
                }}
              >
                <ClipboardPaste
                  size={16}
                />
                usar link copiado
              </button>

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
                  placeholder="Spotify, Apple Music, Deezer ou YouTube"
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

              <div
                className="tabs"
                aria-label="Tipo de busca"
                style={{
                  marginBottom: 12,
                }}
              >
                <button
                  type="button"
                  className={`tab ${
                    searchTarget ===
                    "track"
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setSearchTarget(
                      "track"
                    );
                    setAlbumResults(
                      []
                    );
                    setError("");
                  }}
                >
                  música
                </button>

                <button
                  type="button"
                  className={`tab ${
                    searchTarget ===
                    "album"
                      ? "active"
                      : ""
                  }`}
                  onClick={() => {
                    setSearchTarget(
                      "album"
                    );
                    setResults([]);
                    setError("");
                  }}
                >
                  álbum
                </button>
              </div>

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
                  placeholder={
                    searchTarget === "album"
                      ? "álbum ou artista"
                      : "música, artista ou álbum"
                  }
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

                {albumResults.map(
                  (
                    result,
                    index
                  ) => (
                    <AlbumPreview
                      key={`${result.provider}-${result.provider_album_id}-${index}`}
                      album={
                        result
                      }
                      onClick={() => {
                        setAlbum(
                          result
                        );
                        setTrack(
                          null
                        );
                        setPostType(
                          "review"
                        );
                        setError(
                          ""
                        );
                      }}
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
            track={track!}
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
            <span className="choiceIcon" aria-hidden="true">
              <Star size={25} strokeWidth={1.8} />
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
            <span className="choiceIcon" aria-hidden="true">
              <ImagePlus size={25} strokeWidth={1.8} />
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
              ? album
                ? "o que ficou desse álbum?"
                : "o que ela fez com você?"
              : "guarde isso."}
          </h1>

          {album ? (
            <AlbumPreview
              album={album}
            />
          ) : (
            <TrackPreview
              track={track!}
            />
          )}

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
           * TAG COLETIVA
           * -----------------------
           */}

          <div
            style={{
              position:
                "relative",
            }}
          >
            <label
              htmlFor="post-tag"
              style={{
                display:
                  "block",
                marginBottom:
                  7,
              }}
            >
              tag{" "}
              <span
                className="subtle"
                style={{
                  fontWeight:
                    400,
                }}
              >
                opcional
              </span>
            </label>

            <div
              style={{
                position:
                  "relative",
              }}
            >
              <Hash
                size={15}
                aria-hidden="true"
                style={{
                  position:
                    "absolute",
                  left: 14,
                  top: "50%",
                  zIndex: 2,
                  transform:
                    "translateY(-50%)",
                  color:
                    "#8a8a85",
                  pointerEvents:
                    "none",
                }}
              />

              <input
                id="post-tag"
                className="field"
                value={trend}
                onFocus={() =>
                  setTagFocused(
                    true
                  )
                }
                onBlur={() =>
                  setTagFocused(
                    false
                  )
                }
                onChange={(
                  event
                ) =>
                  setTrend(
                    event.target
                      .value
                      .replace(
                        /^#+/,
                        ""
                      )
                  )
                }
                maxLength={40}
                autoComplete="off"
                placeholder="late night"
                style={{
                  paddingLeft:
                    35,
                }}
              />
            </div>

            {tagFocused &&
              visibleTags.length >
                0 && (
                <div
                  style={{
                    position:
                      "absolute",
                    top:
                      "calc(100% + 7px)",
                    left: 0,
                    right: 0,
                    zIndex: 30,
                    overflow:
                      "hidden",
                    padding: 6,
                    border:
                      "1px solid rgba(0,0,0,.08)",
                    borderRadius:
                      16,
                    background:
                      "rgba(255,255,255,.97)",
                    boxShadow:
                      "0 18px 50px rgba(0,0,0,.12)",
                    backdropFilter:
                      "blur(20px)",
                  }}
                >
                  <div
                    className="subtle"
                    style={{
                      padding:
                        "7px 9px 6px",
                      fontSize:
                        10,
                    }}
                  >
                    {tagTerm
                      ? "tags parecidas"
                      : "usadas por aqui"}
                  </div>

                  {visibleTags.map(
                    (item) => (
                      <button
                        type="button"
                        key={
                          item.label
                        }
                        onMouseDown={(
                          event
                        ) => {
                          event.preventDefault();

                          setTrend(
                            item.label
                          );

                          setTagFocused(
                            false
                          );
                        }}
                        style={{
                          width:
                            "100%",
                          minHeight:
                            42,
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap: 9,
                          padding:
                            "0 10px",
                          border: 0,
                          borderRadius:
                            11,
                          cursor:
                            "pointer",
                          color:
                            "#222",
                          background:
                            "transparent",
                          font:
                            "inherit",
                          textAlign:
                            "left",
                        }}
                      >
                        <Hash
                          size={14}
                          style={{
                            flex:
                              "0 0 auto",
                            color:
                              "#777772",
                          }}
                        />

                        <strong
                          style={{
                            minWidth:
                              0,
                            flex: 1,
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
                            item.label
                          }
                        </strong>

                        <span
                          className="subtle"
                          style={{
                            flex:
                              "0 0 auto",
                            fontSize:
                              10,
                          }}
                        >
                          {
                            item.count
                          }{" "}
                          {item.count ===
                          1
                            ? "post"
                            : "posts"}
                        </span>
                      </button>
                    )
                  )}
                </div>
              )}

            {tagTerm &&
              !tagSuggestions.some(
                (item) =>
                  item.label.toLowerCase() ===
                  tagTerm
              ) && (
                <p
                  className="subtle"
                  style={{
                    margin:
                      "6px 2px 0",
                    fontSize:
                      10,
                  }}
                >
                  nova tag · #
                  {cleanTag(
                    trend
                  )}
                </p>
              )}
          </div>

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
                ? album
                  ? "escreva sua review do álbum"
                  : "escreva sua review"
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
            onClick={() => {
              if (album) {
                setAlbum(
                  null
                );
                setAlbumResults(
                  []
                );
                setPostType(
                  null
                );
                return;
              }

              setPostType(
                null
              );
            }}
          >
            voltar
          </button>
        </div>
      )}
    </div>
  );
}