import {
  NextResponse,
} from "next/server";

import {
  searchApple,
  searchAppleAlbums,
} from "@/lib/music/apple";

import {
  searchSpotify,
  searchSpotifyAlbums,
  searchSpotifyArtists,
  searchSpotifyPlaylists,
} from "@/lib/music/spotify";

type SearchType =
  | "all"
  | "track"
  | "album"
  | "artist"
  | "playlist";

function readType(
  value: string | null
): SearchType {
  if (
    value === "track" ||
    value === "album" ||
    value === "artist" ||
    value === "playlist"
  ) {
    return value;
  }

  return "all";
}

export async function GET(
  req: Request
) {
  const url =
    new URL(req.url);

  const q =
    url.searchParams
      .get("q")
      ?.trim() ?? "";

  const type =
    readType(
      url.searchParams.get(
        "type"
      )
    );

  if (q.length < 2) {
    return NextResponse.json({
      tracks: [],
      albums: [],
      artists: [],
      playlists: [],
    });
  }

  try {
    if (type === "track") {
      try {
        return NextResponse.json({
          tracks:
            await searchSpotify(
              q
            ),
          source: "spotify",
        });
      } catch {
        return NextResponse.json({
          tracks:
            await searchApple(
              q
            ),
          source: "apple",
        });
      }
    }

    if (type === "album") {
      try {
        return NextResponse.json({
          albums:
            await searchSpotifyAlbums(
              q
            ),
          source: "spotify",
        });
      } catch {
        return NextResponse.json({
          albums:
            await searchAppleAlbums(
              q
            ),
          source: "apple",
        });
      }
    }

    if (type === "artist") {
      return NextResponse.json({
        artists:
          await searchSpotifyArtists(
            q
          ),
        source: "spotify",
      });
    }

    if (type === "playlist") {
      return NextResponse.json({
        playlists:
          await searchSpotifyPlaylists(
            q
          ),
        source: "spotify",
      });
    }

    /*
     * Busca universal usada pelo novo Composer.
     * Spotify devolve os quatro tipos em paralelo.
     */
    try {
      const [
        tracks,
        albums,
        artists,
        playlists,
      ] = await Promise.all([
        searchSpotify(q),
        searchSpotifyAlbums(q),
        searchSpotifyArtists(q),
        searchSpotifyPlaylists(q),
      ]);

      return NextResponse.json({
        tracks,
        albums,
        artists,
        playlists,
        source: "spotify",
      });
    } catch {
      /*
       * Se Spotify estiver indisponível, mantemos
       * música + álbum usando o fallback Apple.
       */
      const [
        tracks,
        albums,
      ] = await Promise.all([
        searchApple(q),
        searchAppleAlbums(q),
      ]);

      return NextResponse.json({
        tracks,
        albums,
        artists: [],
        playlists: [],
        source: "apple",
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Busca indisponível.",
      },
      {
        status: 502,
      }
    );
  }
}
