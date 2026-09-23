import {
  deezerTrack,
} from "./normalize";

import type {
  ResolvedAlbum,
  ResolvedArtist,
  ResolvedPlaylist,
} from "@/types";

type DeezerAlbum = {
  id?: number;
  title?: string;
  cover_xl?: string;
  cover_big?: string;
  link?: string;
  release_date?: string;
  nb_tracks?: number;
  artist?: {
    name?: string;
  };
  error?: unknown;
};

type DeezerArtist = {
  id?: number;
  name?: string;
  picture_xl?: string;
  picture_big?: string;
  link?: string;
  error?: unknown;
};

type DeezerPlaylist = {
  id?: number;
  title?: string;
  description?: string;
  picture_xl?: string;
  picture_big?: string;
  link?: string;
  nb_tracks?: number;
  creator?: {
    name?: string;
  };
  error?: unknown;
};

type DeezerKind =
  | "track"
  | "album"
  | "artist"
  | "playlist";

function deezerResourceId(
  value: string,
  kind: DeezerKind
) {
  const url =
    new URL(value);

  if (
    !url.hostname.endsWith(
      "deezer.com"
    )
  ) {
    return null;
  }

  const match =
    url.pathname.match(
      new RegExp(
        `/${kind}/(\\d+)`
      )
    );

  return (
    match?.[1] ??
    null
  );
}

export function deezerId(
  url: string
) {
  return deezerResourceId(
    url,
    "track"
  );
}

export function deezerAlbumId(
  url: string
) {
  return deezerResourceId(
    url,
    "album"
  );
}

export function deezerArtistId(
  url: string
) {
  return deezerResourceId(
    url,
    "artist"
  );
}

export function deezerPlaylistId(
  url: string
) {
  return deezerResourceId(
    url,
    "playlist"
  );
}

export async function resolveDeezerShortUrl(
  value: string
) {
  const url =
    new URL(value);

  if (
    !url.hostname.startsWith(
      "link.deezer."
    )
  ) {
    return value;
  }

  const response =
    await fetch(
      value,
      {
        redirect:
          "follow",
        signal:
          AbortSignal.timeout(
            7000
          ),
      }
    );

  return response.url;
}

async function deezerApi<T>(
  path: string
): Promise<T> {
  const response =
    await fetch(
      `https://api.deezer.com/${path}`,
      {
        signal:
          AbortSignal.timeout(
            7000
          ),
        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw new Error(
      "Não consegui consultar o Deezer."
    );
  }

  const json =
    await response.json();

  if (json?.error) {
    throw new Error(
      "Não encontrei esse conteúdo no Deezer."
    );
  }

  return json as T;
}

export async function resolveDeezer(
  value: string
) {
  const resolvedUrl =
    await resolveDeezerShortUrl(
      value
    );

  const id =
    deezerId(
      resolvedUrl
    );

  if (!id) {
    throw new Error(
      "Esse link do Deezer não parece ser de uma música."
    );
  }

  return deezerTrack(
    await deezerApi(
      `track/${id}`
    )
  );
}

export async function resolveDeezerAlbum(
  value: string
): Promise<ResolvedAlbum> {
  const resolvedUrl =
    await resolveDeezerShortUrl(
      value
    );

  const id =
    deezerAlbumId(
      resolvedUrl
    );

  if (!id) {
    throw new Error(
      "Esse link do Deezer não parece ser de um álbum."
    );
  }

  const album =
    await deezerApi<DeezerAlbum>(
      `album/${id}`
    );

  if (
    !album.title ||
    !album.artist?.name
  ) {
    throw new Error(
      "Esse álbum não trouxe informações suficientes."
    );
  }

  const sourceUrl =
    album.link ||
    resolvedUrl;

  return {
    provider: "deezer",
    provider_album_id:
      id,
    title:
      album.title,
    artist:
      album.artist.name,
    artwork_url:
      album.cover_xl ||
      album.cover_big ||
      null,
    source_url:
      sourceUrl,
    spotify_url:
      null,
    apple_music_url:
      null,
    deezer_url:
      sourceUrl,
    release_date:
      album.release_date ??
      null,
    total_tracks:
      typeof album.nb_tracks ===
      "number"
        ? album.nb_tracks
        : null,
  };
}

export async function resolveDeezerArtist(
  value: string
): Promise<ResolvedArtist> {
  const resolvedUrl =
    await resolveDeezerShortUrl(
      value
    );

  const id =
    deezerArtistId(
      resolvedUrl
    );

  if (!id) {
    throw new Error(
      "Esse link do Deezer não parece ser de um artista."
    );
  }

  const artist =
    await deezerApi<DeezerArtist>(
      `artist/${id}`
    );

  if (!artist.name) {
    throw new Error(
      "Esse artista não trouxe informações suficientes."
    );
  }

  const sourceUrl =
    artist.link ||
    resolvedUrl;

  return {
    provider: "deezer",
    provider_artist_id:
      id,
    name:
      artist.name,
    artwork_url:
      artist.picture_xl ||
      artist.picture_big ||
      null,
    source_url:
      sourceUrl,
    spotify_url:
      null,
    apple_music_url:
      null,
    deezer_url:
      sourceUrl,
  };
}

export async function resolveDeezerPlaylist(
  value: string
): Promise<ResolvedPlaylist> {
  const resolvedUrl =
    await resolveDeezerShortUrl(
      value
    );

  const id =
    deezerPlaylistId(
      resolvedUrl
    );

  if (!id) {
    throw new Error(
      "Esse link do Deezer não parece ser de uma playlist."
    );
  }

  const playlist =
    await deezerApi<DeezerPlaylist>(
      `playlist/${id}`
    );

  if (!playlist.title) {
    throw new Error(
      "Essa playlist não trouxe informações suficientes."
    );
  }

  const sourceUrl =
    playlist.link ||
    resolvedUrl;

  return {
    provider: "deezer",
    provider_playlist_id:
      id,
    title:
      playlist.title,
    owner_name:
      playlist.creator
        ?.name ??
      null,
    description:
      playlist.description ??
      null,
    artwork_url:
      playlist.picture_xl ||
      playlist.picture_big ||
      null,
    source_url:
      sourceUrl,
    spotify_url:
      null,
    apple_music_url:
      null,
    deezer_url:
      sourceUrl,
    total_tracks:
      typeof playlist.nb_tracks ===
      "number"
        ? playlist.nb_tracks
        : null,
  };
}
