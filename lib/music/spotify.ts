import { spotifyTrack } from "./normalize";

let tokenCache: {
  token: string;
  expires: number;
} | null = null;

type SpotifyAlbumItem = {
  id: string;
  name: string;
  album_type?: string;
  total_tracks?: number;
  release_date?: string;
  artists?: Array<{
    name?: string;
  }>;
  images?: Array<{
    url?: string;
    width?: number | null;
    height?: number | null;
  }>;
  external_urls?: {
    spotify?: string;
  };
};

export type ResolvedAlbum = {
  provider: "spotify";
  provider_album_id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  source_url: string;
  spotify_url: string;
  apple_music_url: null;
  deezer_url: null;
  release_date: string | null;
  total_tracks: number | null;
};

async function token() {
  if (
    tokenCache &&
    tokenCache.expires >
      Date.now() + 30_000
  ) {
    return tokenCache.token;
  }

  const id =
    process.env.SPOTIFY_CLIENT_ID;

  const secret =
    process.env.SPOTIFY_CLIENT_SECRET;

  if (!id || !secret) {
    throw new Error(
      "Spotify não configurado: adicione SPOTIFY_CLIENT_ID e SPOTIFY_CLIENT_SECRET."
    );
  }

  const response = await fetch(
    "https://accounts.spotify.com/api/token",
    {
      method: "POST",
      headers: {
        Authorization:
          `Basic ${Buffer.from(
            `${id}:${secret}`
          ).toString("base64")}`,
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body:
        "grant_type=client_credentials",
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      "Não foi possível autenticar no Spotify."
    );
  }

  const json = await response.json();

  tokenCache = {
    token: json.access_token,
    expires:
      Date.now() +
      json.expires_in * 1000,
  };

  return tokenCache.token;
}

export function spotifyId(
  url: string
) {
  const parsed = new URL(url);

  if (
    ![
      "open.spotify.com",
      "spotify.link",
    ].includes(parsed.hostname)
  ) {
    return null;
  }

  const match =
    parsed.pathname.match(
      /\/track\/([A-Za-z0-9]+)/
    );

  return match?.[1] ?? null;
}

export function spotifyAlbumId(
  url: string
) {
  const parsed = new URL(url);

  if (
    ![
      "open.spotify.com",
      "spotify.link",
    ].includes(parsed.hostname)
  ) {
    return null;
  }

  const match =
    parsed.pathname.match(
      /\/album\/([A-Za-z0-9]+)/
    );

  return match?.[1] ?? null;
}

export async function resolveSpotifyAlbum(
  url: string
): Promise<ResolvedAlbum> {
  let resolvedUrl = url;
  let id =
    spotifyAlbumId(
      resolvedUrl
    );

  /*
   * Links curtos do app podem vir como spotify.link.
   * Seguimos o redirect e então lemos /album/:id.
   */
  if (
    !id &&
    new URL(resolvedUrl)
      .hostname ===
      "spotify.link"
  ) {
    const redirectResponse =
      await fetch(
        resolvedUrl,
        {
          redirect:
            "follow",
          signal:
            AbortSignal.timeout(
              7000
            ),
        }
      );

    resolvedUrl =
      redirectResponse.url;

    id =
      spotifyAlbumId(
        resolvedUrl
      );
  }

  if (!id) {
    throw new Error(
      "Esse link do Spotify não parece ser de um álbum."
    );
  }

  const accessToken =
    await token();

  /*
   * Endpoint oficial atual:
   * GET /v1/albums/{id}
   */
  const response = await fetch(
    `https://api.spotify.com/v1/albums/${id}?market=BR`,
    {
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
      signal:
        AbortSignal.timeout(
          7000
        ),
    }
  );

  if (!response.ok) {
    throw new Error(
      response.status === 429
        ? "Spotify pediu para tentar novamente em instantes."
        : "Não encontrei esse álbum no Spotify."
    );
  }

  const album =
    (await response.json()) as
      SpotifyAlbumItem;

  /*
   * Mantemos a mesma regra da busca de álbuns:
   * um link de single não entra como Review de álbum.
   */
  if (
    album.album_type ===
      "single"
  ) {
    throw new Error(
      "Esse link é de um single. Use como música no AUX."
    );
  }

  return spotifyAlbum(
    album
  );
}

export async function resolveSpotify(
  url: string
) {
  let id = spotifyId(url);

  if (
    !id &&
    new URL(url).hostname ===
      "spotify.link"
  ) {
    const response =
      await fetch(url, {
        redirect: "follow",
      });

    id = spotifyId(
      response.url
    );
  }

  if (!id) {
    throw new Error(
      "Esse link do Spotify não parece ser de uma música."
    );
  }

  const accessToken =
    await token();

  const response = await fetch(
    `https://api.spotify.com/v1/tracks/${id}?market=BR`,
    {
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
      signal:
        AbortSignal.timeout(
          7000
        ),
    }
  );

  if (!response.ok) {
    throw new Error(
      response.status === 429
        ? "Spotify pediu para tentar novamente em instantes."
        : "Não encontrei essa música no Spotify."
    );
  }

  return spotifyTrack(
    await response.json()
  );
}

export async function searchSpotify(
  q: string
) {
  const accessToken =
    await token();

  const response = await fetch(
    `https://api.spotify.com/v1/search?type=track&limit=8&market=BR&q=${encodeURIComponent(
      q
    )}`,
    {
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
      signal:
        AbortSignal.timeout(
          7000
        ),
    }
  );

  if (!response.ok) {
    throw new Error(
      "A busca do Spotify falhou."
    );
  }

  const json =
    await response.json();

  return (
    json.tracks?.items ?? []
  ).map(spotifyTrack);
}

/* =========================================================
   ALBUM SEARCH
   Mantida separada da busca de tracks para não alterar
   nenhum consumidor atual do AUX.
   ========================================================= */

function spotifyAlbum(
  album: SpotifyAlbumItem
): ResolvedAlbum {
  const sourceUrl =
    album.external_urls
      ?.spotify ?? "";

  return {
    provider: "spotify",

    provider_album_id:
      album.id,

    title:
      album.name,

    artist:
      (album.artists ?? [])
        .map(
          (artist) =>
            artist.name
        )
        .filter(Boolean)
        .join(", ") ||
      "Artista desconhecido",

    /*
     * A API já devolve as imagens da capa em tamanhos
     * diferentes. Não alteramos/cortamos a imagem aqui;
     * apenas guardamos a URL fornecida pelo Spotify.
     */
    artwork_url:
      album.images?.[0]
        ?.url ?? null,

    source_url:
      sourceUrl,

    spotify_url:
      sourceUrl,

    apple_music_url:
      null,

    deezer_url:
      null,

    release_date:
      album.release_date ??
      null,

    total_tracks:
      typeof album.total_tracks ===
      "number"
        ? album.total_tracks
        : null,
  };
}

export async function searchSpotifyAlbums(
  q: string
): Promise<ResolvedAlbum[]> {
  const clean = q.trim();

  if (clean.length < 2) {
    return [];
  }

  const accessToken =
    await token();

  const response = await fetch(
    `https://api.spotify.com/v1/search?type=album&limit=8&market=BR&q=${encodeURIComponent(
      clean
    )}`,
    {
      headers: {
        Authorization:
          `Bearer ${accessToken}`,
      },
      signal:
        AbortSignal.timeout(
          7000
        ),
    }
  );

  if (!response.ok) {
    throw new Error(
      response.status === 429
        ? "Spotify pediu para tentar novamente em instantes."
        : "A busca de álbuns do Spotify falhou."
    );
  }

  const json =
    await response.json();

  return (
    json.albums?.items ?? []
  )
    .filter(
      (
        album: SpotifyAlbumItem
      ) =>
        Boolean(
          album?.id &&
          album?.name
        ) &&
        album.album_type !==
          "single"
    )
    .map(spotifyAlbum);
}
