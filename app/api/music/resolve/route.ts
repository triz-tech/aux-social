import {
  NextResponse,
} from "next/server";

import {
  resolveSpotifyAlbum,
  spotifyAlbumId,
} from "@/lib/music/spotify";

import {
  resolveMusicUrl,
} from "@/lib/music/resolver";

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

    const isSpotify =
      [
        "open.spotify.com",
        "spotify.link",
      ].includes(
        parsed.hostname
      );

    /*
     * =========================================
     * SPOTIFY — ÁLBUM
     * =========================================
     *
     * Link normal:
     * open.spotify.com/album/...
     *
     * Aqui sabemos imediatamente que é álbum.
     */
    if (
      isSpotify &&
      spotifyAlbumId(url)
    ) {
      return NextResponse.json({
        album:
          await resolveSpotifyAlbum(
            url
          ),
        kind: "album",
      });
    }

    /*
     * spotify.link não informa no próprio pathname se
     * aponta para track ou album.
     *
     * Tentamos álbum primeiro. Se o redirect terminar em
     * /track/, o resolver de álbum simplesmente não encontra
     * album id e seguimos para o resolver normal de música.
     */
    if (
      parsed.hostname ===
      "spotify.link"
    ) {
      try {
        const album =
          await resolveSpotifyAlbum(
            url
          );

        return NextResponse.json({
          album,
          kind: "album",
        });
      } catch (
        albumError
      ) {
        try {
          return NextResponse.json({
            track:
              await resolveMusicUrl(
                url
              ),
            kind: "track",
          });
        } catch (
          trackError
        ) {
          /*
           * Se o primeiro resolver reconheceu que era um
           * single, essa é a mensagem mais útil.
           */
          if (
            albumError instanceof
              Error &&
            albumError.message
              .toLowerCase()
              .includes(
                "single"
              )
          ) {
            throw albumError;
          }

          throw trackError;
        }
      }
    }

    /*
     * =========================================
     * TRACK / OUTROS PROVIDERS
     * =========================================
     *
     * Mantém Apple Music, Deezer e links Spotify de
     * música exatamente no fluxo que já funcionava.
     */
    return NextResponse.json({
      track:
        await resolveMusicUrl(
          url
        ),
      kind: "track",
    });
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
