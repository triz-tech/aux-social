import { NextResponse } from "next/server";

import {
  searchApple,
  searchAppleAlbums,
} from "@/lib/music/apple";

import {
  searchSpotify,
  searchSpotifyAlbums,
} from "@/lib/music/spotify";

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
    url.searchParams.get(
      "type"
    ) === "album"
      ? "album"
      : "track";

  if (q.length < 2) {
    return NextResponse.json(
      type === "album"
        ? { albums: [] }
        : { tracks: [] }
    );
  }

  try {
    /*
     * ==========================================
     * ÁLBUNS
     * ==========================================
     *
     * Novo fluxo opt-in:
     * /api/music/search?q=...&type=album
     *
     * Nenhum consumidor antigo recebe álbuns
     * sem pedir explicitamente.
     */
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

    /*
     * ==========================================
     * MÚSICAS
     * ==========================================
     *
     * Mantém exatamente o contrato anterior:
     * /api/music/search?q=...
     * continua retornando { tracks: [...] }.
     */
    try {
      return NextResponse.json({
        tracks:
          await searchSpotify(q),
        source: "spotify",
      });
    } catch {
      return NextResponse.json({
        tracks:
          await searchApple(q),
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
