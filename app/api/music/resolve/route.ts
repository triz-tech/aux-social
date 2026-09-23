import {
  NextResponse,
} from "next/server";

import {
  resolveSpotify,
  resolveSpotifyAlbum,
  resolveSpotifyArtist,
  resolveSpotifyPlaylist,
  resolveSpotifyShortUrl,
  spotifyAlbumId,
  spotifyArtistId,
  spotifyId,
  spotifyPlaylistId,
} from "@/lib/music/spotify";

import {
  appleAlbumId,
  appleArtistId,
  appleId,
  applePlaylistId,
  resolveApple,
  resolveAppleAlbum,
  resolveAppleArtist,
  resolveApplePlaylist,
} from "@/lib/music/apple";

import {
  deezerAlbumId,
  deezerArtistId,
  deezerId,
  deezerPlaylistId,
  resolveDeezer,
  resolveDeezerAlbum,
  resolveDeezerArtist,
  resolveDeezerPlaylist,
  resolveDeezerShortUrl,
} from "@/lib/music/deezer";

import {
  resolveYouTube,
  resolveYouTubePlaylist,
  youtubePlaylistId,
} from "@/lib/music/youtube";

function safeUrl(
  value: string
) {
  try {
    const parsed =
      new URL(value);

    if (
      parsed.protocol !==
        "https:" &&
      parsed.protocol !==
        "http:"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export async function POST(
  req: Request
) {
  try {
    const body =
      await req.json();

    const url =
      typeof body?.url ===
      "string"
        ? body.url.trim()
        : "";

    if (
      !url ||
      url.length > 2000
    ) {
      return NextResponse.json(
        {
          error:
            "Link inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const parsed =
      safeUrl(url);

    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "Link inválido.",
        },
        {
          status: 400,
        }
      );
    }

    const host =
      parsed.hostname
        .toLowerCase();

    /*
     * SPOTIFY
     */
    if (
      host ===
        "open.spotify.com" ||
      host ===
        "spotify.link"
    ) {
      const resolvedUrl =
        await resolveSpotifyShortUrl(
          url
        );

      if (
        spotifyPlaylistId(
          resolvedUrl
        )
      ) {
        return NextResponse.json({
          playlist:
            await resolveSpotifyPlaylist(
              resolvedUrl
            ),
          kind:
            "playlist",
        });
      }

      if (
        spotifyArtistId(
          resolvedUrl
        )
      ) {
        return NextResponse.json({
          artist:
            await resolveSpotifyArtist(
              resolvedUrl
            ),
          kind:
            "artist",
        });
      }

      if (
        spotifyAlbumId(
          resolvedUrl
        )
      ) {
        return NextResponse.json({
          album:
            await resolveSpotifyAlbum(
              resolvedUrl
            ),
          kind:
            "album",
        });
      }

      if (
        spotifyId(
          resolvedUrl
        )
      ) {
        return NextResponse.json({
          track:
            await resolveSpotify(
              resolvedUrl
            ),
          kind:
            "track",
        });
      }
    }

    /*
     * APPLE MUSIC
     */
    if (
      host ===
        "music.apple.com"
    ) {
      if (
        applePlaylistId(
          url
        )
      ) {
        return NextResponse.json({
          playlist:
            await resolveApplePlaylist(
              url
            ),
          kind:
            "playlist",
        });
      }

      if (
        appleArtistId(
          url
        )
      ) {
        return NextResponse.json({
          artist:
            await resolveAppleArtist(
              url
            ),
          kind:
            "artist",
        });
      }

      if (
        appleId(url)
      ) {
        return NextResponse.json({
          track:
            await resolveApple(
              url
            ),
          kind:
            "track",
        });
      }

      if (
        appleAlbumId(
          url
        )
      ) {
        return NextResponse.json({
          album:
            await resolveAppleAlbum(
              url
            ),
          kind:
            "album",
        });
      }
    }

    /*
     * DEEZER
     */
    if (
      host ===
        "deezer.com" ||
      host.endsWith(
        ".deezer.com"
      )
    ) {
      const resolvedUrl =
        await resolveDeezerShortUrl(
          url
        );

      if (
        deezerPlaylistId(
          resolvedUrl
        )
      ) {
        return NextResponse.json({
          playlist:
            await resolveDeezerPlaylist(
              resolvedUrl
            ),
          kind:
            "playlist",
        });
      }

      if (
        deezerArtistId(
          resolvedUrl
        )
      ) {
        return NextResponse.json({
          artist:
            await resolveDeezerArtist(
              resolvedUrl
            ),
          kind:
            "artist",
        });
      }

      if (
        deezerAlbumId(
          resolvedUrl
        )
      ) {
        return NextResponse.json({
          album:
            await resolveDeezerAlbum(
              resolvedUrl
            ),
          kind:
            "album",
        });
      }

      if (
        deezerId(
          resolvedUrl
        )
      ) {
        return NextResponse.json({
          track:
            await resolveDeezer(
              resolvedUrl
            ),
          kind:
            "track",
        });
      }
    }

    /*
     * YOUTUBE / YOUTUBE MUSIC
     *
     * Se houver `list`, priorizamos playlist.
     * Um link watch?v=...&list=... pode representar uma música
     * dentro de uma playlist; para compartilhar a playlist,
     * o AUX considera o `list`.
     */
    if (
      [
        "youtube.com",
        "www.youtube.com",
        "music.youtube.com",
        "m.youtube.com",
        "youtu.be",
      ].includes(host)
    ) {
      if (
        youtubePlaylistId(
          url
        )
      ) {
        return NextResponse.json({
          playlist:
            await resolveYouTubePlaylist(
              url
            ),
          kind:
            "playlist",
        });
      }

      return NextResponse.json({
        track:
          await resolveYouTube(
            url
          ),
        kind:
          "track",
      });
    }

    throw new Error(
      "Cole um link do Spotify, Apple Music, Deezer, YouTube ou YouTube Music."
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não consegui resolver esse link.",
      },
      {
        status: 422,
      }
    );
  }
}
