import type {
  ResolvedPlaylist,
  ResolvedTrack,
} from "@/types";

type YouTubeOEmbed = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
};

type YouTubePlaylistResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      thumbnails?: {
        maxres?: {
          url?: string;
        };
        standard?: {
          url?: string;
        };
        high?: {
          url?: string;
        };
        medium?: {
          url?: string;
        };
        default?: {
          url?: string;
        };
      };
    };
    contentDetails?: {
      itemCount?: number;
    };
  }>;
};

function normalizedHost(
  url: URL
) {
  return url.hostname
    .toLowerCase()
    .replace(
      /^www\./,
      ""
    );
}

function getVideoId(
  url: URL
) {
  const host =
    normalizedHost(url);

  if (
    host === "youtu.be"
  ) {
    return (
      url.pathname
        .split("/")
        .filter(Boolean)[0] ??
      null
    );
  }

  if (
    host ===
      "youtube.com" ||
    host ===
      "music.youtube.com" ||
    host ===
      "m.youtube.com"
  ) {
    if (
      url.pathname ===
      "/watch"
    ) {
      return (
        url.searchParams.get(
          "v"
        ) ?? null
      );
    }

    const parts =
      url.pathname
        .split("/")
        .filter(Boolean);

    if (
      parts[0] ===
        "shorts" ||
      parts[0] ===
        "embed"
    ) {
      return (
        parts[1] ??
        null
      );
    }
  }

  return null;
}

export function youtubePlaylistId(
  value: string
) {
  const url =
    new URL(value);

  const host =
    normalizedHost(url);

  if (
    ![
      "youtube.com",
      "music.youtube.com",
      "m.youtube.com",
      "youtu.be",
    ].includes(host)
  ) {
    return null;
  }

  return (
    url.searchParams.get(
      "list"
    ) ?? null
  );
}

function cleanVideoTitle(
  value: string
) {
  return value
    .replace(
      /\s*[\[(](official music video|official video|official audio|audio|lyrics?|lyric video|visualizer)[\])]\s*$/i,
      ""
    )
    .trim();
}

function cleanArtist(
  value: string
) {
  return value
    .replace(
      /\s*-\s*Topic$/i,
      ""
    )
    .trim();
}

function identifyTrack(
  rawTitle: string,
  rawAuthor: string
) {
  const channel =
    cleanArtist(
      rawAuthor
    );

  const separator =
    rawTitle.indexOf(
      " - "
    );

  if (separator > 0) {
    const possibleArtist =
      rawTitle
        .slice(
          0,
          separator
        )
        .trim();

    const possibleTitle =
      cleanVideoTitle(
        rawTitle.slice(
          separator + 3
        )
      );

    if (
      possibleArtist &&
      possibleTitle
    ) {
      return {
        artist:
          cleanArtist(
            possibleArtist
          ),
        title:
          possibleTitle,
      };
    }
  }

  return {
    artist:
      channel ||
      "YouTube",
    title:
      cleanVideoTitle(
        rawTitle
      ),
  };
}

export async function resolveYouTube(
  value: string
): Promise<ResolvedTrack> {
  const url =
    new URL(value);

  const videoId =
    getVideoId(url);

  if (
    !videoId ||
    !/^[a-zA-Z0-9_-]{11}$/.test(
      videoId
    )
  ) {
    throw new Error(
      "Não consegui identificar esse vídeo do YouTube."
    );
  }

  const canonicalUrl =
    `https://www.youtube.com/watch?v=${videoId}`;

  const endpoint =
    "https://www.youtube.com/oembed" +
    `?url=${encodeURIComponent(
      canonicalUrl
    )}` +
    "&format=json";

  const response =
    await fetch(
      endpoint,
      {
        cache: "no-store",
        signal:
          AbortSignal.timeout(
            7000
          ),
      }
    );

  if (!response.ok) {
    throw new Error(
      "Não consegui encontrar os dados desse vídeo no YouTube."
    );
  }

  const data =
    (await response.json()) as
      YouTubeOEmbed;

  if (!data.title) {
    throw new Error(
      "Esse vídeo não trouxe informações suficientes."
    );
  }

  const track =
    identifyTrack(
      data.title,
      data.author_name ?? ""
    );

  return {
    provider:
      "youtube",
    provider_track_id:
      videoId,
    title:
      track.title,
    artist:
      track.artist,
    album:
      null,
    artwork_url:
      data.thumbnail_url ??
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    source_url:
      value,
    duration_ms:
      null,
    external_urls: {
      youtube:
        value,
    },
  };
}

export async function resolveYouTubePlaylist(
  value: string
): Promise<ResolvedPlaylist> {
  const id =
    youtubePlaylistId(
      value
    );

  if (!id) {
    throw new Error(
      "Esse link do YouTube não parece ser de uma playlist."
    );
  }

  const apiKey =
    process.env
      .YOUTUBE_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Para abrir playlists do YouTube/YouTube Music, configure YOUTUBE_API_KEY."
    );
  }

  const response =
    await fetch(
      "https://www.googleapis.com/youtube/v3/playlists" +
        `?part=snippet,contentDetails&id=${encodeURIComponent(
          id
        )}&key=${encodeURIComponent(
          apiKey
        )}`,
      {
        cache: "no-store",
        signal:
          AbortSignal.timeout(
            7000
          ),
      }
    );

  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? "O YouTube recusou a consulta dessa playlist. Confira YOUTUBE_API_KEY."
        : "Não consegui consultar essa playlist no YouTube."
    );
  }

  const json =
    (await response.json()) as
      YouTubePlaylistResponse;

  const item =
    json.items?.[0];

  if (
    !item?.snippet?.title
  ) {
    throw new Error(
      "Não encontrei essa playlist no YouTube."
    );
  }

  const thumbnails =
    item.snippet
      .thumbnails;

  const artwork =
    thumbnails?.maxres?.url ??
    thumbnails?.standard?.url ??
    thumbnails?.high?.url ??
    thumbnails?.medium?.url ??
    thumbnails?.default?.url ??
    null;

  const sourceUrl =
    normalizedHost(
      new URL(value)
    ) ===
    "music.youtube.com"
      ? `https://music.youtube.com/playlist?list=${encodeURIComponent(
          id
        )}`
      : `https://www.youtube.com/playlist?list=${encodeURIComponent(
          id
        )}`;

  return {
    provider:
      "youtube",
    provider_playlist_id:
      id,
    title:
      item.snippet.title,
    owner_name:
      item.snippet
        .channelTitle ??
      null,
    description:
      item.snippet
        .description ??
      null,
    artwork_url:
      artwork,
    source_url:
      sourceUrl,
    spotify_url:
      null,
    apple_music_url:
      null,
    deezer_url:
      null,
    total_tracks:
      typeof item
        .contentDetails
        ?.itemCount ===
      "number"
        ? item
            .contentDetails!
            .itemCount!
        : null,
  };
}
