"use client";

import {
  Camera,
  ClipboardPaste,
  Hash,
  ImagePlus,
  Images,
  Mic2,
  Search,
  Star,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import type {
  Album,
  Artist,
  Playlist,
  Post,
  PostMedia,
  PostSubjectKind,
  PostType,
  Profile,
  ResolvedAlbum,
  ResolvedArtist,
  ResolvedPlaylist,
  ResolvedTrack,
  Track,
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

type UniversalSubject = {
  kind: PostSubjectKind;
  title: string;
  subtitle: string;
  artwork_url: string | null;
  source_url: string;
};

function cleanTag(
  value: string
) {
  return value
    .trim()
    .replace(/^#/, "")
    .trim();
}

function subjectLabel(
  kind: PostSubjectKind
) {
  if (kind === "album") {
    return "álbum";
  }

  if (kind === "artist") {
    return "artista";
  }

  if (kind === "playlist") {
    return "playlist";
  }

  return "música";
}

function UniversalPreview({
  subject,
  onClick,
}: {
  subject: UniversalSubject;
  onClick?: () => void;
}) {
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
        {subject.artwork_url ? (
          <img
            src={
              subject.artwork_url
            }
            alt={`Capa de ${subject.title}`}
            loading="lazy"
            decoding="async"
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
          {subject.title}
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
          {subject.subtitle}
        </span>

        <span
          className="subtle"
          style={{
            display: "block",
            marginTop: 4,
            fontSize: 10,
          }}
        >
          {subjectLabel(
            subject.kind
          )}
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

export default function MusicComposer() {
  const params =
    useSearchParams();
  const router =
    useRouter();

  const [
    recognitionOpen,
    setRecognitionOpen,
  ] = useState(
    params.get("mode") ===
      "listen"
  );

  const [track, setTrack] =
    useState<ResolvedTrack | null>(
      null
    );

  const [album, setAlbum] =
    useState<ResolvedAlbum | null>(
      null
    );

  const [artist, setArtist] =
    useState<ResolvedArtist | null>(
      null
    );

  const [
    playlist,
    setPlaylist,
  ] =
    useState<ResolvedPlaylist | null>(
      null
    );

  const [postType, setPostType] =
    useState<PostType | null>(
      null
    );

  const [input, setInput] =
    useState("");

  const [results, setResults] =
    useState<ResolvedTrack[]>(
      []
    );

  const [
    albumResults,
    setAlbumResults,
  ] =
    useState<ResolvedAlbum[]>(
      []
    );

  const [
    artistResults,
    setArtistResults,
  ] =
    useState<ResolvedArtist[]>(
      []
    );

  const [
    playlistResults,
    setPlaylistResults,
  ] =
    useState<
      ResolvedPlaylist[]
    >([]);

  const [body, setBody] =
    useState("");

  const [rating, setRating] =
    useState(4.5);

  const [trend, setTrend] =
    useState("");

  const [
    tagSuggestions,
    setTagSuggestions,
  ] = useState<
    TagSuggestion[]
  >([]);

  const [
    tagFocused,
    setTagFocused,
  ] = useState(false);

  const [photos, setPhotos] =
    useState<File[]>([]);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    published,
    setPublished,
  ] =
    useState<string | null>(
      null
    );

  const [
    publishedPost,
    setPublishedPost,
  ] =
    useState<Post | null>(
      null
    );

  const [
    shareMessage,
    setShareMessage,
  ] = useState("");

  const subjectKind:
    | PostSubjectKind
    | null = track
    ? "track"
    : album
      ? "album"
      : artist
        ? "artist"
        : playlist
          ? "playlist"
          : null;

  const selectedSubject =
    useMemo<
      UniversalSubject | null
    >(() => {
      if (track) {
        return {
          kind: "track",
          title: track.title,
          subtitle:
            track.artist,
          artwork_url:
            track.artwork_url,
          source_url:
            track.source_url,
        };
      }

      if (album) {
        return {
          kind: "album",
          title: album.title,
          subtitle:
            album.artist,
          artwork_url:
            album.artwork_url,
          source_url:
            album.source_url,
        };
      }

      if (artist) {
        return {
          kind: "artist",
          title: artist.name,
          subtitle: "artista",
          artwork_url:
            artist.artwork_url,
          source_url:
            artist.source_url,
        };
      }

      if (playlist) {
        return {
          kind: "playlist",
          title:
            playlist.title,
          subtitle:
            playlist.owner_name ||
            "playlist",
          artwork_url:
            playlist.artwork_url,
          source_url:
            playlist.source_url,
        };
      }

      return null;
    }, [
      track,
      album,
      artist,
      playlist,
    ]);

  function clearResults() {
    setResults([]);
    setAlbumResults([]);
    setArtistResults([]);
    setPlaylistResults([]);
  }

  function clearSubject() {
    setTrack(null);
    setAlbum(null);
    setArtist(null);
    setPlaylist(null);
    setPostType(null);
    setPhotos([]);
    setError("");
  }

  function chooseTrack(
    value: ResolvedTrack
  ) {
    clearResults();
    setTrack(value);
    setAlbum(null);
    setArtist(null);
    setPlaylist(null);
    setPostType(null);
    setRecognitionOpen(false);
    setError("");
  }

  function chooseAlbum(
    value: ResolvedAlbum
  ) {
    clearResults();
    setTrack(null);
    setAlbum(value);
    setArtist(null);
    setPlaylist(null);
    setPostType(null);
    setRecognitionOpen(false);
    setError("");
  }

  function chooseArtist(
    value: ResolvedArtist
  ) {
    clearResults();
    setTrack(null);
    setAlbum(null);
    setArtist(value);
    setPlaylist(null);
    setPostType(null);
    setRecognitionOpen(false);
    setError("");
  }

  function choosePlaylist(
    value: ResolvedPlaylist
  ) {
    clearResults();
    setTrack(null);
    setAlbum(null);
    setArtist(null);
    setPlaylist(value);
    setPostType(null);
    setRecognitionOpen(false);
    setError("");
  }

  /*
   * Link recebido pelo Web Share Target.
   */
  useEffect(() => {
    const shared =
      extractSharedUrl(
        `${params.get("url") || ""} ${
          params.get("text") || ""
        }`
      );

    if (shared) {
      setInput(shared);
      void resolve(shared);
    }

    // Executar somente na montagem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Tags da comunidade.
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
        error:
          tagsError,
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
            ascending:
              false,
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
              row.trend ??
                ""
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
          .includes(
            tagTerm
          );
      })
      .slice(0, 6);

  function looksLikeUrl(
    value: string
  ) {
    return /^https?:\/\//i.test(
      value.trim()
    );
  }

  async function pasteFromClipboard() {
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

      if (!text) {
        throw new Error(
          "Não encontrei nada copiado."
        );
      }

      const shared =
        extractSharedUrl(
          text
        );

      const value =
        shared || text;

      setInput(value);

      if (
        looksLikeUrl(value)
      ) {
        await resolve(value);
      } else {
        await search(value);
      }
    } catch (caught) {
      if (
        caught instanceof
          DOMException &&
        (
          caught.name ===
            "NotAllowedError" ||
          caught.name ===
            "SecurityError"
        )
      ) {
        setError(
          "Não consegui ler o que foi copiado. Cole no campo."
        );
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Não consegui usar o conteúdo copiado."
      );
    }
  }

  async function submitInput() {
    const clean =
      input.trim();

    if (clean.length < 2) {
      return;
    }

    const shared =
      extractSharedUrl(
        clean
      );

    if (
      shared ||
      looksLikeUrl(clean)
    ) {
      await resolve(
        shared || clean
      );
      return;
    }

    await search(clean);
  }

  async function resolve(
    value: string
  ) {
    setBusy(true);
    setError("");
    clearResults();

    try {
      const response =
        await fetch(
          "/api/music/resolve",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                url: value,
              }),
          }
        );

      const json =
        await response.json();

      if (!response.ok) {
        throw new Error(
          json.error
        );
      }

      if (
        json.kind ===
          "track" &&
        json.track
      ) {
        chooseTrack(
          json.track
        );
        return;
      }

      if (
        json.kind ===
          "album" &&
        json.album
      ) {
        chooseAlbum(
          json.album
        );
        return;
      }

      if (
        json.kind ===
          "artist" &&
        json.artist
      ) {
        chooseArtist(
          json.artist
        );
        return;
      }

      if (
        json.kind ===
          "playlist" &&
        json.playlist
      ) {
        choosePlaylist(
          json.playlist
        );
        return;
      }

      throw new Error(
        "Não consegui identificar esse conteúdo."
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não consegui resolver esse link."
      );
    } finally {
      setBusy(false);
    }
  }

  async function search(
    value = input
  ) {
    const clean =
      value.trim();

    if (clean.length < 2) {
      return;
    }

    setBusy(true);
    setError("");
    clearResults();

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
          json.error
        );
      }

      setResults(
        Array.isArray(
          json.tracks
        )
          ? json.tracks
          : []
      );

      setAlbumResults(
        Array.isArray(
          json.albums
        )
          ? json.albums
          : []
      );

      setArtistResults(
        Array.isArray(
          json.artists
        )
          ? json.artists
          : []
      );

      setPlaylistResults(
        Array.isArray(
          json.playlists
        )
          ? json.playlists
          : []
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "busca indisponível."
      );
    } finally {
      setBusy(false);
    }
  }

  function chooseFiles(
    list: FileList | null
  ) {
    if (!list) {
      return;
    }

    const acceptedFiles =
      Array.from(list)
        .filter(
          (file) =>
            file.type.startsWith(
              "image/"
            ) &&
            file.size <=
              10_000_000
        )
        .slice(0, 6);

    setPhotos(
      (current) =>
        [
          ...current,
          ...acceptedFiles,
        ].slice(0, 6)
    );
  }

  /*
   * Helpers de persistência.
   */
  async function persistTrack(
    supabase: ReturnType<
      typeof createClient
    >,
    value: ResolvedTrack
  ) {
    if (
      value.provider_track_id
    ) {
      const {
        data: existing,
        error: findError,
      } = await supabase
        .from("tracks")
        .select("id")
        .eq(
          "provider",
          value.provider
        )
        .eq(
          "provider_track_id",
          value.provider_track_id
        )
        .maybeSingle();

      if (findError) {
        throw new Error(
          `tracks: ${findError.message}`
        );
      }

      if (existing) {
        return existing.id as string;
      }
    }

    const {
      data,
      error:
        insertError,
    } = await supabase
      .from("tracks")
      .insert({
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
          value.spotify_url ??
          null,
        apple_music_url:
          value.apple_music_url ??
          null,
        deezer_url:
          value.deezer_url ??
          null,
        duration_ms:
          value.duration_ms ??
          null,
      })
      .select("id")
      .single();

    if (
      insertError?.code ===
        "23505" &&
      value.provider_track_id
    ) {
      const {
        data: raced,
        error: raceError,
      } = await supabase
        .from("tracks")
        .select("id")
        .eq(
          "provider",
          value.provider
        )
        .eq(
          "provider_track_id",
          value.provider_track_id
        )
        .single();

      if (raceError) {
        throw new Error(
          `tracks: ${raceError.message}`
        );
      }

      return raced.id as string;
    }

    if (insertError) {
      throw new Error(
        `tracks: ${insertError.message}`
      );
    }

    return data.id as string;
  }

  async function persistAlbum(
    supabase: ReturnType<
      typeof createClient
    >,
    value: ResolvedAlbum
  ) {
    if (
      value.provider_album_id
    ) {
      const {
        data: existing,
        error: findError,
      } = await supabase
        .from("albums")
        .select("id")
        .eq(
          "provider",
          value.provider
        )
        .eq(
          "provider_album_id",
          value.provider_album_id
        )
        .maybeSingle();

      if (findError) {
        throw new Error(
          `albums: ${findError.message}`
        );
      }

      if (existing) {
        return existing.id as string;
      }
    }

    const {
      data,
      error:
        insertError,
    } = await supabase
      .from("albums")
      .insert({
        provider:
          value.provider,
        provider_album_id:
          value.provider_album_id,
        title:
          value.title,
        artist:
          value.artist,
        artwork_url:
          value.artwork_url,
        source_url:
          value.source_url,
        spotify_url:
          value.spotify_url ??
          null,
        apple_music_url:
          value.apple_music_url ??
          null,
        deezer_url:
          value.deezer_url ??
          null,
        release_date:
          value.release_date ??
          null,
        total_tracks:
          value.total_tracks ??
          null,
      })
      .select("id")
      .single();

    if (
      insertError?.code ===
        "23505" &&
      value.provider_album_id
    ) {
      const {
        data: raced,
        error: raceError,
      } = await supabase
        .from("albums")
        .select("id")
        .eq(
          "provider",
          value.provider
        )
        .eq(
          "provider_album_id",
          value.provider_album_id
        )
        .single();

      if (raceError) {
        throw new Error(
          `albums: ${raceError.message}`
        );
      }

      return raced.id as string;
    }

    if (insertError) {
      throw new Error(
        `albums: ${insertError.message}`
      );
    }

    return data.id as string;
  }

  async function persistArtist(
    supabase: ReturnType<
      typeof createClient
    >,
    value: ResolvedArtist
  ) {
    if (
      value.provider_artist_id
    ) {
      const {
        data: existing,
        error: findError,
      } = await supabase
        .from("artists")
        .select("id")
        .eq(
          "provider",
          value.provider
        )
        .eq(
          "provider_artist_id",
          value.provider_artist_id
        )
        .maybeSingle();

      if (findError) {
        throw new Error(
          `artists: ${findError.message}`
        );
      }

      if (existing) {
        return existing.id as string;
      }
    }

    const {
      data,
      error:
        insertError,
    } = await supabase
      .from("artists")
      .insert({
        provider:
          value.provider,
        provider_artist_id:
          value.provider_artist_id,
        name:
          value.name,
        artwork_url:
          value.artwork_url,
        source_url:
          value.source_url,
        spotify_url:
          value.spotify_url ??
          null,
        apple_music_url:
          value.apple_music_url ??
          null,
        deezer_url:
          value.deezer_url ??
          null,
      })
      .select("id")
      .single();

    if (
      insertError?.code ===
        "23505" &&
      value.provider_artist_id
    ) {
      const {
        data: raced,
        error: raceError,
      } = await supabase
        .from("artists")
        .select("id")
        .eq(
          "provider",
          value.provider
        )
        .eq(
          "provider_artist_id",
          value.provider_artist_id
        )
        .single();

      if (raceError) {
        throw new Error(
          `artists: ${raceError.message}`
        );
      }

      return raced.id as string;
    }

    if (insertError) {
      throw new Error(
        `artists: ${insertError.message}`
      );
    }

    return data.id as string;
  }

  async function persistPlaylist(
    supabase: ReturnType<
      typeof createClient
    >,
    value: ResolvedPlaylist
  ) {
    if (
      value.provider_playlist_id
    ) {
      const {
        data: existing,
        error: findError,
      } = await supabase
        .from("playlists")
        .select("id")
        .eq(
          "provider",
          value.provider
        )
        .eq(
          "provider_playlist_id",
          value.provider_playlist_id
        )
        .maybeSingle();

      if (findError) {
        throw new Error(
          `playlists: ${findError.message}`
        );
      }

      if (existing) {
        return existing.id as string;
      }
    }

    const {
      data,
      error:
        insertError,
    } = await supabase
      .from("playlists")
      .insert({
        provider:
          value.provider,
        provider_playlist_id:
          value.provider_playlist_id,
        title:
          value.title,
        owner_name:
          value.owner_name ??
          null,
        description:
          value.description ??
          null,
        artwork_url:
          value.artwork_url,
        source_url:
          value.source_url,
        spotify_url:
          value.spotify_url ??
          null,
        apple_music_url:
          value.apple_music_url ??
          null,
        deezer_url:
          value.deezer_url ??
          null,
        total_tracks:
          value.total_tracks ??
          null,
      })
      .select("id")
      .single();

    if (
      insertError?.code ===
        "23505" &&
      value.provider_playlist_id
    ) {
      const {
        data: raced,
        error: raceError,
      } = await supabase
        .from("playlists")
        .select("id")
        .eq(
          "provider",
          value.provider
        )
        .eq(
          "provider_playlist_id",
          value.provider_playlist_id
        )
        .single();

      if (raceError) {
        throw new Error(
          `playlists: ${raceError.message}`
        );
      }

      return raced.id as string;
    }

    if (insertError) {
      throw new Error(
        `playlists: ${insertError.message}`
      );
    }

    return data.id as string;
  }

  function displayTrack(
    id: string
  ): Track {
    if (track) {
      return {
        id,
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
      };
    }

    if (album) {
      return {
        id,
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
      };
    }

    if (artist) {
      return {
        id,
        provider:
          artist.provider,
        provider_track_id:
          null,
        title:
          artist.name,
        artist:
          artist.name,
        album:
          null,
        artwork_url:
          artist.artwork_url,
        source_url:
          artist.source_url,
        spotify_url:
          artist.spotify_url,
        apple_music_url:
          artist.apple_music_url,
        deezer_url:
          artist.deezer_url,
        duration_ms:
          null,
      };
    }

    if (playlist) {
      return {
        id,
        provider:
          playlist.provider,
        provider_track_id:
          null,
        title:
          playlist.title,
        artist:
          playlist.owner_name ||
          "Playlist",
        album:
          null,
        artwork_url:
          playlist.artwork_url,
        source_url:
          playlist.source_url,
        spotify_url:
          playlist.spotify_url,
        apple_music_url:
          playlist.apple_music_url,
        deezer_url:
          playlist.deezer_url,
        duration_ms:
          null,
      };
    }

    throw new Error(
      "Assunto da publicação ausente."
    );
  }

  async function publish() {
    if (
      !selectedSubject ||
      !subjectKind ||
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
        `Dê uma nota para ${
          subjectKind ===
          "artist"
            ? "o artista"
            : subjectKind ===
                "playlist"
              ? "a playlist"
              : subjectKind ===
                  "album"
                ? "o álbum"
                : "a música"
        }.`
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
      if (IS_DEMO) {
        const id =
          `demo-${Date.now()}`;

        localStorage.setItem(
          "aux-demo-last",
          JSON.stringify({
            id,
            subjectKind,
            track,
            album,
            artist,
            playlist,
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

      const supabase =
        createClient();

      const {
        data: { user },
      } =
        await supabase.auth
          .getUser();

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
      let artistId:
        | string
        | null = null;
      let playlistId:
        | string
        | null = null;

      if (track) {
        trackId =
          await persistTrack(
            supabase,
            track
          );
      }

      if (album) {
        albumId =
          await persistAlbum(
            supabase,
            album
          );
      }

      if (artist) {
        artistId =
          await persistArtist(
            supabase,
            artist
          );
      }

      if (playlist) {
        playlistId =
          await persistPlaylist(
            supabase,
            playlist
          );
      }

      const {
        data: post,
        error: postError,
      } = await supabase
        .from("posts")
        .insert({
          user_id:
            user.id,
          track_id:
            trackId,
          album_id:
            albumId,
          artist_id:
            artistId,
          playlist_id:
            playlistId,
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
          } = await supabase
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

          if (uploadError) {
            throw new Error(
              `storage: ${uploadError.message}`
            );
          }

          const {
            data:
              mediaRow,
            error:
              mediaError,
          } = await supabase
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

          if (mediaError) {
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

      const {
        data: profile,
        error:
          profileError,
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
        .eq(
          "id",
          user.id
        )
        .single();

      if (profileError) {
        throw new Error(
          `profile: ${profileError.message}`
        );
      }

      const subjectId =
        trackId ||
        albumId ||
        artistId ||
        playlistId;

      if (!subjectId) {
        throw new Error(
          "Não consegui salvar o assunto da publicação."
        );
      }

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
            subjectKind,
          track:
            displayTrack(
              subjectId
            ),
          album:
            album && albumId
              ? ({
                  id:
                    albumId,
                  ...album,
                } as Album)
              : null,
          artist:
            artist &&
            artistId
              ? ({
                  id:
                    artistId,
                  ...artist,
                } as Artist)
              : null,
          playlist:
            playlist &&
            playlistId
              ? ({
                  id:
                    playlistId,
                  ...playlist,
                } as Playlist)
              : null,
          media:
            uploadedMedia,
          counts: {
            likes: 0,
            comments: 0,
            reposts: 0,
            liked: false,
            reposted:
              false,
          },
        };

      setPublishedPost(
        createdPost
      );
      setPublished(
        post.id
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Não consegui publicar."
      );
    } finally {
      setBusy(false);
    }
  }

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

      if (
        result ===
        "downloaded"
      ) {
        setShareMessage(
          "Story Card salvo."
        );
      }

      if (
        result ===
        "shared"
      ) {
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

  const hasSearchResults =
    results.length > 0 ||
    albumResults.length >
      0 ||
    artistResults.length >
      0 ||
    playlistResults.length >
      0;

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

      {!selectedSubject ? (
        <div className="stack">
          <div>
            <h1 className="pageTitle">
              o que você quer
              compartilhar?
            </h1>

            <p className="subtle">
              busque por música,
              álbum, artista ou
              playlist — ou cole um
              link.
            </p>
          </div>

          <div className="searchbar">
            <input
              className="field"
              value={input}
              onChange={(
                event
              ) => {
                setInput(
                  event.target
                    .value
                );
                setError("");
              }}
              onKeyDown={(
                event
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  void submitInput();
                }
              }}
              placeholder="música, álbum, artista, playlist ou link"
              autoComplete="off"
            />

            <button
              className="primary"
              onClick={() =>
                void submitInput()
              }
              disabled={busy}
              aria-label="Buscar ou abrir link"
            >
              <Search
                size={18}
              />
            </button>
          </div>

          <button
            type="button"
            className="secondary"
            onClick={() =>
              void pasteFromClipboard()
            }
            disabled={busy}
            style={{
              width: "100%",
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
            usar o que está
            copiado
          </button>

          <button
            type="button"
            className="choice"
            onClick={() => {
              setRecognitionOpen(
                (current) =>
                  !current
              );
              setError("");
            }}
          >
            <span
              className="choiceIcon"
              aria-hidden="true"
            >
              {recognitionOpen ? (
                <X
                  size={25}
                  strokeWidth={1.8}
                />
              ) : (
                <Mic2
                  size={25}
                  strokeWidth={1.8}
                />
              )}
            </span>

            <div>
              <strong>
                {recognitionOpen
                  ? "fechar reconhecimento"
                  : "o que tá tocando?"}
              </strong>

              <span>
                {recognitionOpen
                  ? "voltar para buscar ou colar"
                  : "ouve alguns segundos e tenta identificar"}
              </span>
            </div>
          </button>

          {recognitionOpen && (
            <MusicRecognition
              onFound={
                chooseTrack
              }
            />
          )}

          {busy && (
            <p className="subtle">
              procurando...
            </p>
          )}

          {error && (
            <div
              className="error"
              role="alert"
            >
              {error}
            </div>
          )}

          {hasSearchResults && (
            <div className="results">
              {results.length >
                0 && (
                <>
                  <p className="subtle">
                    músicas
                  </p>

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
                          chooseTrack(
                            result
                          )
                        }
                      />
                    )
                  )}
                </>
              )}

              {albumResults
                .length > 0 && (
                <>
                  <p className="subtle">
                    álbuns
                  </p>

                  {albumResults.map(
                    (
                      result,
                      index
                    ) => (
                      <UniversalPreview
                        key={`${result.provider}-${result.provider_album_id}-${index}`}
                        subject={{
                          kind:
                            "album",
                          title:
                            result.title,
                          subtitle:
                            result.artist,
                          artwork_url:
                            result.artwork_url,
                          source_url:
                            result.source_url,
                        }}
                        onClick={() =>
                          chooseAlbum(
                            result
                          )
                        }
                      />
                    )
                  )}
                </>
              )}

              {artistResults
                .length > 0 && (
                <>
                  <p className="subtle">
                    artistas
                  </p>

                  {artistResults.map(
                    (
                      result,
                      index
                    ) => (
                      <UniversalPreview
                        key={`${result.provider}-${result.provider_artist_id}-${index}`}
                        subject={{
                          kind:
                            "artist",
                          title:
                            result.name,
                          subtitle:
                            "artista",
                          artwork_url:
                            result.artwork_url,
                          source_url:
                            result.source_url,
                        }}
                        onClick={() =>
                          chooseArtist(
                            result
                          )
                        }
                      />
                    )
                  )}
                </>
              )}

              {playlistResults
                .length > 0 && (
                <>
                  <p className="subtle">
                    playlists
                  </p>

                  {playlistResults.map(
                    (
                      result,
                      index
                    ) => (
                      <UniversalPreview
                        key={`${result.provider}-${result.provider_playlist_id}-${index}`}
                        subject={{
                          kind:
                            "playlist",
                          title:
                            result.title,
                          subtitle:
                            result.owner_name ||
                            "playlist",
                          artwork_url:
                            result.artwork_url,
                          source_url:
                            result.source_url,
                        }}
                        onClick={() =>
                          choosePlaylist(
                            result
                          )
                        }
                      />
                    )
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ) : !postType ? (
        <div>
          <h1 className="pageTitle">
            o que ficou?
          </h1>

          <UniversalPreview
            subject={
              selectedSubject
            }
          />

          <div
            style={{
              height: 18,
            }}
          />

          <button
            className="choice"
            onClick={() =>
              setPostType(
                "review"
              )
            }
          >
            <span
              className="choiceIcon"
              aria-hidden="true"
            >
              <Star
                size={25}
                strokeWidth={1.8}
              />
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
              setPostType(
                "memory"
              )
            }
          >
            <span
              className="choiceIcon"
              aria-hidden="true"
            >
              <ImagePlus
                size={25}
                strokeWidth={1.8}
              />
            </span>

            <div>
              <strong>
                Memory
              </strong>

              <span>
                guardar isso junto
                de um momento
              </span>
            </div>
          </button>

          <button
            className="secondary"
            style={{
              marginTop: 12,
            }}
            onClick={
              clearSubject
            }
          >
            trocar{" "}
            {subjectLabel(
              subjectKind!
            )}
          </button>
        </div>
      ) : (
        <div className="stack">
          <h1 className="pageTitle">
            {postType ===
            "review"
              ? `o que ficou ${
                  subjectKind ===
                  "artist"
                    ? "desse artista"
                    : subjectKind ===
                        "playlist"
                      ? "dessa playlist"
                      : subjectKind ===
                          "album"
                        ? "desse álbum"
                        : "dessa música"
                }?`
              : "guarde isso."}
          </h1>

          <UniversalPreview
            subject={
              selectedSubject
            }
          />

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
                    "var(--muted)",
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
                      "1px solid var(--line)",
                    borderRadius:
                      16,
                    background:
                      "var(--surface-solid)",
                    boxShadow:
                      "0 18px 50px rgba(0,0,0,.12)",
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
                            "var(--text)",
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
                              "var(--muted)",
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
                          {item.label}
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
                          {item.count}{" "}
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
          </div>

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
              postType ===
              "review"
                ? `escreva sua review ${
                    subjectKind ===
                    "artist"
                      ? "do artista"
                      : subjectKind ===
                          "playlist"
                        ? "da playlist"
                        : subjectKind ===
                            "album"
                          ? "do álbum"
                          : "da música"
                  }`
                : `qual é a história ${
                    subjectKind ===
                    "artist"
                      ? "desse artista"
                      : subjectKind ===
                          "playlist"
                        ? "dessa playlist"
                        : subjectKind ===
                            "album"
                          ? "desse álbum"
                          : "dessa música"
                  }?`
            }
          />

          {error && (
            <div
              className="error"
              role="alert"
            >
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
