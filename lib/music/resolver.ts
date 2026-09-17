import {
  safeHttpUrl,
} from "@/lib/utils";

import {
  resolveSpotify,
} from "./spotify";

import {
  resolveApple,
} from "./apple";

import {
  resolveDeezer,
} from "./deezer";

import {
  resolveYouTube,
} from "./youtube";

export async function resolveMusicUrl(
  value: string
) {
  const url =
    safeHttpUrl(value);

  if (!url) {
    throw new Error(
      "Cole um link http ou https válido."
    );
  }

  const host =
    url.hostname
      .toLowerCase()
      .replace(
        /^www\./,
        ""
      );

  /*
   * Spotify
   */

  if (
    host ===
      "open.spotify.com" ||
    host.endsWith(
      ".spotify.com"
    )
  ) {
    return resolveSpotify(
      url.toString()
    );
  }

  /*
   * Apple Music
   */

  if (
    host ===
      "music.apple.com"
  ) {
    return resolveApple(
      url.toString()
    );
  }

  /*
   * Deezer
   */

  if (
    host ===
      "deezer.com" ||
    host.endsWith(
      ".deezer.com"
    )
  ) {
    return resolveDeezer(
      url.toString()
    );
  }

  /*
   * YouTube + YouTube Music
   */

  if (
    host ===
      "youtube.com" ||
    host ===
      "music.youtube.com" ||
    host ===
      "m.youtube.com" ||
    host ===
      "youtu.be"
  ) {
    return resolveYouTube(
      url.toString()
    );
  }

  throw new Error(
    "Cole um link do Spotify, Apple Music, Deezer, YouTube ou YouTube Music."
  );
}