import {
  appleTrack,
  type AppleResource,
} from "./normalize";

import type {
  ResolvedAlbum,
  ResolvedArtist,
  ResolvedPlaylist,
  ResolvedTrack,
} from "@/types";

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

type AppleArtistResource = {
  wrapperType?: string;
  artistType?: string;
  artistId?: number;
  artistName?: string;
  artistLinkUrl?: string;
  primaryGenreName?: string;
};

type AppleArtwork = {
  url?: string;
};

type AppleDescription = {
  standard?: string;
  short?: string;
};

type AppleCatalogResource = {
  id: string;
  type?: string;
  attributes?: {
    name?: string;
    artistName?: string;
    albumName?: string;
    curatorName?: string;
    artwork?: AppleArtwork;
    url?: string;
    releaseDate?: string;
    trackCount?: number;
    durationInMillis?: number;
    description?: AppleDescription;
  };
  relationships?: {
    tracks?: {
      data?: unknown[];
      meta?: {
        total?: number;
      };
    };
  };
};

type AppleCatalogResponse = {
  data?: AppleCatalogResource[];
};

function storefrontFromUrl(
  url: URL
) {
  const first =
    url.pathname
      .split("/")
      .filter(Boolean)[0];

  return (
    first?.toLowerCase() ||
    process.env
      .APPLE_MUSIC_STOREFRONT ||
    "br"
  );
}

function applePathParts(
  url: URL
) {
  return url.pathname
    .split("/")
    .filter(Boolean);
}

function resourceIdAfterKind(
  url: URL,
  kind:
    | "album"
    | "artist"
    | "playlist"
) {
  const parts =
    applePathParts(url);

  const index =
    parts.indexOf(kind);

  if (
    index < 0 ||
    !parts[index + 2]
  ) {
    return null;
  }

  return (
    parts[index + 2] ??
    null
  );
}

export function appleId(
  value: string
) {
  const url =
    new URL(value);

  if (
    !url.hostname.endsWith(
      "music.apple.com"
    )
  ) {
    return null;
  }

  /*
   * Links de música do Apple Music aparecem em mais de um formato:
   *
   * 1) música dentro de um álbum:
   *    /album/.../ALBUM_ID?i=TRACK_ID
   *
   * 2) link direto de música:
   *    /song/.../TRACK_ID
   *
   * O fluxo anterior do AUX aceitava ambos. Mantemos isso aqui.
   */
  const fromQuery =
    url.searchParams.get("i");

  if (
    fromQuery &&
    /^\d+$/.test(fromQuery)
  ) {
    return fromQuery;
  }

  const parts =
    url.pathname
      .split("/")
      .filter(Boolean);

  const songIndex =
    parts.indexOf("song");

  if (
    songIndex >= 0 &&
    parts[songIndex + 2] &&
    /^\d+$/.test(
      parts[songIndex + 2]
    )
  ) {
    return parts[
      songIndex + 2
    ];
  }

  return null;
}

export function appleAlbumId(
  value: string
) {
  const url =
    new URL(value);

  if (
    !url.hostname.endsWith(
      "music.apple.com"
    ) ||
    appleId(value)
  ) {
    return null;
  }

  const id =
    resourceIdAfterKind(
      url,
      "album"
    );

  return id &&
    /^\d+$/.test(id)
    ? id
    : null;
}

export function appleArtistId(
  value: string
) {
  const url =
    new URL(value);

  if (
    !url.hostname.endsWith(
      "music.apple.com"
    )
  ) {
    return null;
  }

  const id =
    resourceIdAfterKind(
      url,
      "artist"
    );

  return id &&
    /^\d+$/.test(id)
    ? id
    : null;
}

export function applePlaylistId(
  value: string
) {
  const url =
    new URL(value);

  if (
    !url.hostname.endsWith(
      "music.apple.com"
    )
  ) {
    return null;
  }

  return resourceIdAfterKind(
    url,
    "playlist"
  );
}

function largerArtwork(
  value?: string | null
) {
  if (!value) {
    return null;
  }

  return value
    .replace(
      /\{w\}/g,
      "1200"
    )
    .replace(
      /\{h\}/g,
      "1200"
    )
    .replace(
      /100x100bb/g,
      "1200x1200bb"
    )
    .replace(
      /100x100/g,
      "1200x1200"
    );
}

async function appleCatalog(
  url: string,
  kind:
    | "songs"
    | "albums"
    | "artists"
    | "playlists",
  id: string
) {
  const token =
    process.env
      .APPLE_MUSIC_DEVELOPER_TOKEN;

  if (!token) {
    return null;
  }

  const storefront =
    storefrontFromUrl(
      new URL(url)
    );

  const response =
    await fetch(
      `https://api.music.apple.com/v1/catalog/${storefront}/${kind}/${encodeURIComponent(
        id
      )}`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
        signal:
          AbortSignal.timeout(
            7000
          ),
        cache: "no-store",
      }
    );

  if (!response.ok) {
    return null;
  }

  const json =
    (await response.json()) as
      AppleCatalogResponse;

  return (
    json.data?.[0] ??
    null
  );
}

export async function resolveApple(
  url: string
) {
  const id =
    appleId(url);

  if (!id) {
    throw new Error(
      "Esse link do Apple Music não parece ser de uma música."
    );
  }

  const catalog =
    await appleCatalog(
      url,
      "songs",
      id
    );

  if (catalog) {
    const attributes =
      catalog.attributes;

    if (
      attributes?.name &&
      attributes.artistName
    ) {
      const sourceUrl =
        attributes.url || url;

      const resolvedTrack:
        ResolvedTrack = {
          provider:
            "apple",
          provider_track_id:
            catalog.id,
          title:
            attributes.name,
          artist:
            attributes.artistName,
          album:
            attributes.albumName ??
            null,
          artwork_url:
            largerArtwork(
              attributes.artwork
                ?.url
            ),
          source_url:
            sourceUrl,
          spotify_url:
            null,
          apple_music_url:
            sourceUrl,
          deezer_url:
            null,
          duration_ms:
            typeof attributes
              .durationInMillis ===
            "number"
              ? attributes
                  .durationInMillis
              : null,
          external_urls: {
            appleMusic:
              sourceUrl,
          },
        };

      return resolvedTrack;
    }
  }

  const response =
    await fetch(
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
      "Não encontrei essa música no catálogo Apple."
    );
  }

  return appleTrack(song);
}

function appleAlbumFromPublic(
  album: AppleAlbumResource
): ResolvedAlbum | null {
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
      album.releaseDate
        ? album.releaseDate.slice(
            0,
            10
          )
        : null,
    total_tracks:
      typeof album.trackCount ===
      "number"
        ? album.trackCount
        : null,
  };
}

export async function resolveAppleAlbum(
  url: string
): Promise<ResolvedAlbum> {
  const id =
    appleAlbumId(url);

  if (!id) {
    throw new Error(
      "Esse link do Apple Music não parece ser de um álbum."
    );
  }

  const catalog =
    await appleCatalog(
      url,
      "albums",
      id
    );

  if (catalog) {
    const a =
      catalog.attributes ??
      {};

    if (
      !a.name ||
      !a.artistName
    ) {
      throw new Error(
        "Esse álbum não trouxe informações suficientes."
      );
    }

    const sourceUrl =
      a.url || url;

    return {
      provider: "apple",
      provider_album_id:
        id,
      title:
        a.name,
      artist:
        a.artistName,
      artwork_url:
        largerArtwork(
          a.artwork?.url
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
        a.releaseDate
          ? a.releaseDate.slice(
              0,
              10
            )
          : null,
      total_tracks:
        typeof a.trackCount ===
        "number"
          ? a.trackCount
          : null,
    };
  }

  const response =
    await fetch(
      `https://itunes.apple.com/lookup?id=${encodeURIComponent(
        id
      )}&entity=album&country=BR`,
      {
        signal:
          AbortSignal.timeout(
            7000
          ),
      }
    );

  if (!response.ok) {
    throw new Error(
      "Não consegui consultar esse álbum na Apple."
    );
  }

  const json =
    (await response.json()) as {
      results?: AppleAlbumResource[];
    };

  const result =
    json.results
      ?.map(
        appleAlbumFromPublic
      )
      .find(Boolean);

  if (!result) {
    throw new Error(
      "Não encontrei esse álbum no catálogo Apple."
    );
  }

  return result;
}

export async function resolveAppleArtist(
  url: string
): Promise<ResolvedArtist> {
  const id =
    appleArtistId(url);

  if (!id) {
    throw new Error(
      "Esse link do Apple Music não parece ser de um artista."
    );
  }

  const catalog =
    await appleCatalog(
      url,
      "artists",
      id
    );

  if (catalog) {
    const a =
      catalog.attributes ??
      {};

    if (!a.name) {
      throw new Error(
        "Esse artista não trouxe informações suficientes."
      );
    }

    const sourceUrl =
      a.url || url;

    return {
      provider: "apple",
      provider_artist_id:
        id,
      name:
        a.name,
      artwork_url:
        largerArtwork(
          a.artwork?.url
        ),
      source_url:
        sourceUrl,
      spotify_url:
        null,
      apple_music_url:
        sourceUrl,
      deezer_url:
        null,
    };
  }

  const response =
    await fetch(
      `https://itunes.apple.com/lookup?id=${encodeURIComponent(
        id
      )}&entity=musicArtist&country=BR`,
      {
        signal:
          AbortSignal.timeout(
            7000
          ),
      }
    );

  if (!response.ok) {
    throw new Error(
      "Não consegui consultar esse artista na Apple."
    );
  }

  const json =
    (await response.json()) as {
      results?: AppleArtistResource[];
    };

  const result =
    json.results?.find(
      (item) =>
        item.artistId ===
        Number(id)
    );

  if (
    !result?.artistName
  ) {
    throw new Error(
      "Não encontrei esse artista no catálogo Apple."
    );
  }

  return {
    provider: "apple",
    provider_artist_id:
      id,
    name:
      result.artistName,
    artwork_url:
      null,
    source_url:
      result.artistLinkUrl ||
      url,
    spotify_url:
      null,
    apple_music_url:
      result.artistLinkUrl ||
      url,
    deezer_url:
      null,
  };
}

export async function resolveApplePlaylist(
  url: string
): Promise<ResolvedPlaylist> {
  const id =
    applePlaylistId(url);

  if (!id) {
    throw new Error(
      "Esse link do Apple Music não parece ser de uma playlist."
    );
  }

  const catalog =
    await appleCatalog(
      url,
      "playlists",
      id
    );

  if (!catalog) {
    throw new Error(
      "Ainda não consigo abrir playlists do Apple Music. Tente Spotify, Deezer ou YouTube Music por enquanto."
    );
  }

  const a =
    catalog.attributes ??
    {};

  if (!a.name) {
    throw new Error(
      "Essa playlist não trouxe informações suficientes."
    );
  }

  const total =
    catalog.relationships
      ?.tracks?.meta
      ?.total ??
    catalog.relationships
      ?.tracks?.data
      ?.length ??
    null;

  const sourceUrl =
    a.url || url;

  return {
    provider: "apple",
    provider_playlist_id:
      id,
    title:
      a.name,
    owner_name:
      a.curatorName ??
      null,
    description:
      a.description?.standard ??
      a.description?.short ??
      null,
    artwork_url:
      largerArtwork(
        a.artwork?.url
      ),
    source_url:
      sourceUrl,
    spotify_url:
      null,
    apple_music_url:
      sourceUrl,
    deezer_url:
      null,
    total_tracks:
      typeof total ===
      "number"
        ? total
        : null,
  };
}

export async function searchApple(
  q: string
) {
  const response =
    await fetch(
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

export async function searchAppleAlbums(
  q: string
): Promise<ResolvedAlbum[]> {
  const clean =
    q.trim();

  if (clean.length < 2) {
    return [];
  }

  const response =
    await fetch(
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
    .map(
      appleAlbumFromPublic
    )
    .filter(
      (
        album
      ): album is ResolvedAlbum =>
        album !== null
    );
}
