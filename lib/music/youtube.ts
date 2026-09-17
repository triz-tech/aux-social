import type {
  ResolvedTrack,
} from "@/types";

type YouTubeOEmbed = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
};

function getVideoId(
  url: URL
) {
  const host =
    url.hostname
      .toLowerCase()
      .replace(/^www\./, "");

  /*
   * youtu.be/VIDEO_ID
   */
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

  /*
   * youtube.com
   * music.youtube.com
   * m.youtube.com
   */
  if (
    host === "youtube.com" ||
    host ===
      "music.youtube.com" ||
    host ===
      "m.youtube.com"
  ) {
    /*
     * /watch?v=VIDEO_ID
     */
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

    /*
     * Também deixamos o AUX
     * entender Shorts e embeds.
     */
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
        parts[1] ?? null
      );
    }
  }

  return null;
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

  /*
   * Muitos uploads oficiais usam:
   *
   * Dua Lipa - Training Season
   *
   * Quando isso acontecer,
   * conseguimos separar artista
   * e música.
   */

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

  /*
   * Usamos o endereço padrão do
   * YouTube para buscar os metadados,
   * inclusive quando a pessoa colou
   * um link do YouTube Music.
   */

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
      }
    );

  if (!response.ok) {
    throw new Error(
      "Não consegui encontrar os dados desse vídeo no YouTube."
    );
  }

  const data =
    (await response.json()) as YouTubeOEmbed;

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

    /*
     * Mantemos o link que a pessoa
     * realmente colou.
     *
     * Então um link do YouTube Music
     * continua levando ao YouTube Music.
     */
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