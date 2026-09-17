import { NextResponse } from "next/server";

const okHosts = [
  // Spotify
  "i.scdn.co",

  // Apple Music
  "is1-ssl.mzstatic.com",
  "is2-ssl.mzstatic.com",

  // Deezer
  "e-cdns-images.dzcdn.net",

  // YouTube / YouTube Music
  "i.ytimg.com",
  "img.youtube.com",

  // AUX / demo
  "images.unsplash.com",
];

export async function GET(
  req: Request
) {
  try {
    const raw = new URL(
      req.url
    ).searchParams.get("url");

    if (!raw) {
      throw new Error();
    }

    const url =
      new URL(raw);

    const isSupabase =
      url.hostname.endsWith(
        ".supabase.co"
      );

    const isAllowedHost =
      okHosts.includes(
        url.hostname
      );

    if (
      url.protocol !== "https:" ||
      (!isAllowedHost &&
        !isSupabase)
    ) {
      return new NextResponse(
        "blocked",
        {
          status: 403,
        }
      );
    }

    const response =
      await fetch(url, {
        signal:
          AbortSignal.timeout(
            7000
          ),
      });

    if (!response.ok) {
      throw new Error();
    }

    /*
     * Garante que o proxy só devolva
     * uma imagem.
     */

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      !contentType.startsWith(
        "image/"
      )
    ) {
      return new NextResponse(
        "invalid image",
        {
          status: 415,
        }
      );
    }

    return new NextResponse(
      response.body,
      {
        headers: {
          "Content-Type":
            contentType,

          "Cache-Control":
            "public, max-age=86400",
        },
      }
    );
  } catch {
    return new NextResponse(
      "image unavailable",
      {
        status: 404,
      }
    );
  }
}