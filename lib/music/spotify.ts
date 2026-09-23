import { spotifyTrack } from "./normalize";

let tokenCache: {
  token: string;
  expires: number;
} | null = null;

type SpotifyImage = {
  url?: string;
  width?: number | null;
  height?: number | null;
};

type SpotifyAlbumItem = {
  id: string;
  name: string;
  album_type?: string;
  total_tracks?: number;
  release_date?: string;
  artists?: Array<{
    name?: string;
  }>;
  images?: SpotifyImage[];
  external_urls?: {
    spotify?: string;
  };
};

type SpotifyArtistItem = {
  id: string;
  name: string;
  images?: SpotifyImage[];
  external_urls?: {
    spotify?: string;
  };
};

type SpotifyPlaylistItem = {
  id: string;
  name: string;
  description?: string;
  images?: SpotifyImage[];
  owner?: {
    display_name?: string;
  };

  /*
   * Spotify passou a expor `items` no objeto simplificado
   * de playlist. `tracks` ainda pode aparecer em respostas
   * antigas/legadas, então aceitamos os dois formatos.
   */
  items?: {
    total?: number;
  };

  tracks?: {
    total?: number;
  };

  external_urls?: {
    spotify?: string;
  };
};

type SpotifyOEmbed = {
  title?: string;
  thumbnail_url?: string | null;
};

export type ResolvedSpotifyAlbum = {
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

export type ResolvedSpotifyArtist = {
  provider: "spotify";
  provider_artist_id: string;
  name: string;
  artwork_url: string | null;
  source_url: string;
  spotify_url: string;
  apple_music_url: null;
  deezer_url: null;
};

export type ResolvedSpotifyPlaylist = {
  provider: "spotify";
  provider_playlist_id: string;
  title: string;
  owner_name: string | null;
  description: string | null;
  artwork_url: string | null;
  source_url: string;
  spotify_url: string;
  apple_music_url: null;
  deezer_url: null;
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

  const json =
    await response.json();

  tokenCache = {
    token: json.access_token,
    expires:
      Date.now() +
      json.expires_in * 1000,
  };

  return tokenCache.token;
}

function spotifyResourceId(
  url: string,
  kind:
    | "track"
    | "album"
    | "artist"
    | "playlist"
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
      new RegExp(
        `/${kind}/([A-Za-z0-9]+)`
      )
    );

  return match?.[1] ?? null;
}

export function spotifyId(
  url: string
) {
  return spotifyResourceId(
    url,
    "track"
  );
}

export function spotifyAlbumId(
  url: string
) {
  return spotifyResourceId(
    url,
    "album"
  );
}

export function spotifyArtistId(
  url: string
) {
  return spotifyResourceId(
    url,
    "artist"
  );
}

export function spotifyPlaylistId(
  url: string
) {
  return spotifyResourceId(
    url,
    "playlist"
  );
}

export async function resolveSpotifyShortUrl(
  url: string
) {
  if (
    new URL(url).hostname !==
    "spotify.link"
  ) {
    return url;
  }

  const response =
    await fetch(url, {
      redirect: "follow",
      signal:
        AbortSignal.timeout(
          7000
        ),
    });

  return response.url;
}

function spotifyAlbum(
  album: SpotifyAlbumItem
): ResolvedSpotifyAlbum {
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

function spotifyArtist(
  artist: SpotifyArtistItem
): ResolvedSpotifyArtist {
  const sourceUrl =
    artist.external_urls
      ?.spotify ?? "";

  return {
    provider: "spotify",
    provider_artist_id:
      artist.id,
    name:
      artist.name,
    artwork_url:
      artist.images?.[0]
        ?.url ?? null,
    source_url:
      sourceUrl,
    spotify_url:
      sourceUrl,
    apple_music_url:
      null,
    deezer_url:
      null,
  };
}

function spotifyPlaylist(
  playlist: SpotifyPlaylistItem
): ResolvedSpotifyPlaylist {
  const sourceUrl =
    playlist.external_urls
      ?.spotify ?? "";

  return {
    provider: "spotify",
    provider_playlist_id:
      playlist.id,
    title:
      playlist.name,
    owner_name:
      playlist.owner
        ?.display_name ??
      null,
    description:
      playlist.description ??
      null,
    artwork_url:
      playlist.images?.[0]
        ?.url ?? null,
    source_url:
      sourceUrl,
    spotify_url:
      sourceUrl,
    apple_music_url:
      null,
    deezer_url:
      null,
    total_tracks:
      typeof playlist.items
        ?.total === "number"
        ? playlist.items.total
        : typeof playlist.tracks
            ?.total === "number"
          ? playlist.tracks.total
          : null,
  };
}

export async function resolveSpotifyAlbum(
  url: string
): Promise<ResolvedSpotifyAlbum> {
  const resolvedUrl =
    await resolveSpotifyShortUrl(
      url
    );

  const id =
    spotifyAlbumId(
      resolvedUrl
    );

  if (!id) {
    throw new Error(
      "Esse link do Spotify não parece ser de um álbum."
    );
  }

  const accessToken =
    await token();

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

  return spotifyAlbum(album);
}

export async function resolveSpotifyArtist(
  url: string
): Promise<ResolvedSpotifyArtist> {
  const resolvedUrl =
    await resolveSpotifyShortUrl(
      url
    );

  const id =
    spotifyArtistId(
      resolvedUrl
    );

  if (!id) {
    throw new Error(
      "Esse link do Spotify não parece ser de um artista."
    );
  }

  const accessToken =
    await token();

  const response = await fetch(
    `https://api.spotify.com/v1/artists/${id}`,
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
        : "Não encontrei esse artista no Spotify."
    );
  }

  return spotifyArtist(
    await response.json()
  );
}

async function resolveSpotifyPlaylistOEmbed(
  resolvedUrl: string,
  id: string
): Promise<ResolvedSpotifyPlaylist> {
  const canonicalUrl =
    `https://open.spotify.com/playlist/${id}`;

  const response = await fetch(
    `https://open.spotify.com/oembed?url=${encodeURIComponent(
      canonicalUrl
    )}`,
    {
      signal:
        AbortSignal.timeout(
          7000
        ),
    }
  );

  if (!response.ok) {
    throw new Error(
      `Spotify não conseguiu abrir essa playlist (oEmbed ${response.status}).`
    );
  }

  const json =
    (await response.json()) as
      SpotifyOEmbed;

  const title =
    json.title?.trim();

  if (!title) {
    throw new Error(
      "Spotify respondeu sem o nome da playlist."
    );
  }

  return {
    provider: "spotify",
    provider_playlist_id:
      id,
    title,
    owner_name:
      null,
    description:
      null,
    artwork_url:
      json.thumbnail_url ??
      null,
    source_url:
      canonicalUrl,
    spotify_url:
      canonicalUrl,
    apple_music_url:
      null,
    deezer_url:
      null,
    total_tracks:
      null,
  };
}

export async function resolveSpotifyPlaylist(
  url: string
): Promise<ResolvedSpotifyPlaylist> {
  const resolvedUrl =
    await resolveSpotifyShortUrl(
      url
    );

  const id =
    spotifyPlaylistId(
      resolvedUrl
    );

  if (!id) {
    throw new Error(
      "Esse link do Spotify não parece ser de uma playlist."
    );
  }

  const accessToken =
    await token();

  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${id}?market=BR`,
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

  if (response.ok) {
    return spotifyPlaylist(
      await response.json()
    );
  }

  /*
   * Algumas playlists compartilháveis podem não devolver
   * metadata pelo Web API usando Client Credentials.
   *
   * O oEmbed oficial do Spotify é suficiente para o AUX:
   * nome + capa + link. Dono e quantidade ficam nulos quando
   * o Spotify não os disponibiliza nesse caminho.
   */
  try {
    return await resolveSpotifyPlaylistOEmbed(
      resolvedUrl,
      id
    );
  } catch {
    if (
      response.status === 429
    ) {
      throw new Error(
        "Spotify pediu para tentar novamente em instantes."
      );
    }

    if (
      response.status === 401
    ) {
      throw new Error(
        "Spotify recusou a autenticação ao abrir essa playlist (401)."
      );
    }

    if (
      response.status === 403
    ) {
      throw new Error(
        "O Spotify não liberou acesso a essa playlist (403)."
      );
    }

    if (
      response.status === 404
    ) {
      throw new Error(
        "O Spotify não encontrou essa playlist pela API (404)."
      );
    }

    throw new Error(
      `Não consegui abrir essa playlist no Spotify (status ${response.status}).`
    );
  }
}

export async function resolveSpotify(
  url: string
) {
  const resolvedUrl =
    await resolveSpotifyShortUrl(
      url
    );

  const id =
    spotifyId(
      resolvedUrl
    );

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

export async function searchSpotifyAlbums(
  q: string
): Promise<ResolvedSpotifyAlbum[]> {
  const clean =
    q.trim();

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
        )
    )
    .map(spotifyAlbum);
}

export async function searchSpotifyArtists(
  q: string
): Promise<ResolvedSpotifyArtist[]> {
  const clean =
    q.trim();

  if (clean.length < 2) {
    return [];
  }

  const accessToken =
    await token();

  const response = await fetch(
    `https://api.spotify.com/v1/search?type=artist&limit=8&market=BR&q=${encodeURIComponent(
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
        : "A busca de artistas do Spotify falhou."
    );
  }

  const json =
    await response.json();

  return (
    json.artists?.items ?? []
  )
    .filter(
      (
        artist: SpotifyArtistItem
      ) =>
        Boolean(
          artist?.id &&
          artist?.name
        )
    )
    .map(spotifyArtist);
}

export async function searchSpotifyPlaylists(
  q: string
): Promise<ResolvedSpotifyPlaylist[]> {
  const clean =
    q.trim();

  if (clean.length < 2) {
    return [];
  }

  const accessToken =
    await token();

  const response = await fetch(
    `https://api.spotify.com/v1/search?type=playlist&limit=8&market=BR&q=${encodeURIComponent(
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
        : "A busca de playlists do Spotify falhou."
    );
  }

  const json =
    await response.json();

  return (
    json.playlists?.items ?? []
  )
    .filter(
      (
        playlist:
          | SpotifyPlaylistItem
          | null
      ) =>
        Boolean(
          playlist?.id &&
          playlist?.name
        )
    )
    .map(
      (
        playlist:
          SpotifyPlaylistItem
      ) =>
        spotifyPlaylist(
          playlist
        )
    );
}
