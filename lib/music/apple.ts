import {
  appleTrack,
  type AppleResource,
} from "./normalize";

/*
 * Resultado de álbum do iTunes Search API.
 * Mantemos esse tipo local para não mexer ainda no normalize.ts
 * nem no fluxo existente de músicas.
 */
type AppleAlbumResource = {
  wrapperType?: string;
  collectionType?: string;

  collectionId?: number;
  collectionName?: string;

  artistName?: string;

  artworkUrl100?: string;

  collectionViewUrl?: string;

  releaseDate?: string;
  trackCount?: number;
};

export type ResolvedAppleAlbum = {
  provider: "apple";

  provider_album_id: string;

  title: string;
  artist: string;

  artwork_url: string | null;
  source_url: string;

  spotify_url: null;
  apple_music_url: string;
  deezer_url: null;

  release_date: string | null;
  total_tracks: number | null;
};

export function appleId(
  url: string
) {
  const parsed = new URL(url);

  if (
    !parsed.hostname.endsWith(
      "music.apple.com"
    )
  ) {
    return null;
  }

  return (
    parsed.searchParams.get("i") ??
    parsed.pathname.match(
      /\/(\d+)(?:\?|$)/
    )?.[1] ??
    null
  );
}

export async function resolveApple(
  url: string
) {
  const id = appleId(url);

  if (!id) {
    throw new Error(
      "Esse link do Apple Music não parece ser de uma música."
    );
  }

  const token =
    process.env
      .APPLE_MUSIC_DEVELOPER_TOKEN;

  if (token) {
    const storefront =
      process.env
        .APPLE_MUSIC_STOREFRONT ||
      "br";

    const response = await fetch(
      `https://api.music.apple.com/v1/catalog/${storefront}/songs/${id}`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
        signal:
          AbortSignal.timeout(
            7000
          ),
      }
    );

    if (response.ok) {
      const json =
        await response.json();

      if (json.data?.[0]) {
        return appleTrack(
          json.data[0]
        );
      }
    }
  }

  const response = await fetch(
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(
      id
    )}&entity=song&country=BR`,
    {
      signal:
        AbortSignal.timeout(
          7000
        ),
    }
  );

  if (!response.ok) {
    throw new Error(
      "Não consegui consultar o catálogo Apple."
    );
  }

  const json =
    (await response.json()) as {
      results?: AppleResource[];
    };

  const song =
    json.results?.find(
      (item) =>
        item.wrapperType ===
        "track"
    );

  if (!song) {
    throw new Error(
      "Não encontrei essa música no catálogo Apple. Configure APPLE_MUSIC_DEVELOPER_TOKEN para cobertura completa."
    );
  }

  return appleTrack(song);
}

export async function searchApple(
  q: string
) {
  const response = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(
      q
    )}&entity=song&limit=12&country=BR`,
    {
      signal:
        AbortSignal.timeout(
          7000
        ),
    }
  );

  if (!response.ok) {
    throw new Error(
      "A busca musical falhou."
    );
  }

  const json =
    await response.json();

  return (
    json.results ?? []
  ).map(appleTrack);
}

/* =========================================================
   ALBUM SEARCH
   Separada de searchApple() para preservar todos os fluxos
   atuais que ainda esperam somente músicas em json.tracks.
   ========================================================= */

function largerArtwork(
  value?: string
) {
  if (!value) {
    return null;
  }

  /*
   * O resultado público normalmente vem com artworkUrl100.
   * Apenas pedimos uma versão maior da mesma imagem.
   */
  return value
    .replace(
      /100x100bb/g,
      "600x600bb"
    )
    .replace(
      /100x100/g,
      "600x600"
    );
}

function appleAlbum(
  album: AppleAlbumResource
): ResolvedAppleAlbum | null {
  const id =
    album.collectionId;

  const title =
    album.collectionName?.trim();

  const artist =
    album.artistName?.trim();

  const sourceUrl =
    album.collectionViewUrl?.trim();

  if (
    !id ||
    !title ||
    !artist ||
    !sourceUrl
  ) {
    return null;
  }

  let releaseDate:
    | string
    | null = null;

  if (album.releaseDate) {
    /*
     * O banco guarda DATE, portanto enviamos apenas YYYY-MM-DD.
     */
    releaseDate =
      album.releaseDate.slice(
        0,
        10
      );
  }

  return {
    provider: "apple",

    provider_album_id:
      String(id),

    title,
    artist,

    artwork_url:
      largerArtwork(
        album.artworkUrl100
      ),

    source_url:
      sourceUrl,

    spotify_url:
      null,

    apple_music_url:
      sourceUrl,

    deezer_url:
      null,

    release_date:
      releaseDate,

    total_tracks:
      typeof album.trackCount ===
      "number"
        ? album.trackCount
        : null,
  };
}

export async function searchAppleAlbums(
  q: string
): Promise<ResolvedAppleAlbum[]> {
  const clean =
    q.trim();

  if (clean.length < 2) {
    return [];
  }

  const response = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(
      clean
    )}&entity=album&limit=12&country=BR`,
    {
      signal:
        AbortSignal.timeout(
          7000
        ),
    }
  );

  if (!response.ok) {
    throw new Error(
      "A busca de álbuns falhou."
    );
  }

  const json =
    (await response.json()) as {
      results?: AppleAlbumResource[];
    };

  return (
    json.results ?? []
  )
    .map(appleAlbum)
    .filter(
      (
        album
      ): album is ResolvedAppleAlbum =>
        album !== null
    );
}
