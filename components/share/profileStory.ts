"use client";

import type { Post, Profile } from "@/types";

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);

  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(
    x + width,
    y + height,
    x,
    y + height,
    r
  );
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function circleCrop(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number
) {
  ctx.save();

  ctx.beginPath();
  ctx.arc(
    x + size / 2,
    y + size / 2,
    size / 2,
    0,
    Math.PI * 2
  );
  ctx.clip();

  const scale = Math.max(
    size / image.naturalWidth,
    size / image.naturalHeight
  );

  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;

  ctx.drawImage(
    image,
    x + (size - width) / 2,
    y + (size - height) / 2,
    width,
    height
  );

  ctx.restore();
}

function coverCrop(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  radius: number
) {
  ctx.save();

  roundedRect(
    ctx,
    x,
    y,
    size,
    size,
    radius
  );
  ctx.clip();

  const scale = Math.max(
    size / image.naturalWidth,
    size / image.naturalHeight
  );

  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;

  ctx.drawImage(
    image,
    x + (size - width) / 2,
    y + (size - height) / 2,
    width,
    height
  );

  ctx.restore();
}

async function loadImage(
  url: string
): Promise<HTMLImageElement> {
  const image = new Image();

  const source = url.startsWith("data:")
    ? url
    : `/api/image-proxy?url=${encodeURIComponent(
        url
      )}`;

  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error(
          "não consegui carregar uma imagem do perfil."
        )
      );

    image.src = source;
  });
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  initialSize: number,
  weight = 700
) {
  let size = initialSize;

  while (size > 28) {
    ctx.font = `${weight} ${size}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

    if (ctx.measureText(text).width <= maxWidth) {
      break;
    }

    size -= 2;
  }

  return size;
}

function canvasToBlob(
  canvas: HTMLCanvasElement
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(
          new Error(
            "não consegui finalizar o card."
          )
        );
      },
      "image/png",
      1
    );
  });
}

function downloadBlob(
  blob: Blob,
  filename: string
) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function shareProfileStory(
  profile: Profile,
  rotation: Post[]
): Promise<"shared" | "downloaded"> {
  const canvas = document.createElement("canvas");

  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "não consegui criar o card do perfil."
    );
  }

  /*
   * ========================================================
   * BACKGROUND
   * ========================================================
   */

  ctx.fillStyle = "#f5f5f2";
  ctx.fillRect(
    0,
    0,
    STORY_WIDTH,
    STORY_HEIGHT
  );

  const glow = ctx.createRadialGradient(
    STORY_WIDTH * 0.76,
    STORY_HEIGHT * 0.18,
    0,
    STORY_WIDTH * 0.76,
    STORY_HEIGHT * 0.18,
    650
  );

  glow.addColorStop(
    0,
    "rgba(255,255,255,.98)"
  );
  glow.addColorStop(
    1,
    "rgba(255,255,255,0)"
  );

  ctx.fillStyle = glow;
  ctx.fillRect(
    0,
    0,
    STORY_WIDTH,
    STORY_HEIGHT
  );

  /*
   * ========================================================
   * AUX
   * ========================================================
   */

  ctx.fillStyle = "#111111";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font =
    '800 58px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  ctx.fillText("aux.", 82, 112);

  /*
   * ========================================================
   * PROFILE
   * ========================================================
   */

  const avatarSize = 170;
  const avatarX =
    (STORY_WIDTH - avatarSize) / 2;
  const avatarY = 220;

  if (profile.avatar_url) {
    try {
      const avatar = await loadImage(
        profile.avatar_url
      );

      circleCrop(
        ctx,
        avatar,
        avatarX,
        avatarY,
        avatarSize
      );
    } catch {
      ctx.fillStyle = "#e7e7e3";
      ctx.beginPath();
      ctx.arc(
        STORY_WIDTH / 2,
        avatarY + avatarSize / 2,
        avatarSize / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();

      ctx.fillStyle = "#111111";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font =
        '750 62px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

      ctx.fillText(
        profile.display_name
          ?.charAt(0)
          .toUpperCase() || "?",
        STORY_WIDTH / 2,
        avatarY + avatarSize / 2 + 2
      );
    }
  } else {
    ctx.fillStyle = "#e7e7e3";
    ctx.beginPath();
    ctx.arc(
      STORY_WIDTH / 2,
      avatarY + avatarSize / 2,
      avatarSize / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = "#111111";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font =
      '750 62px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    ctx.fillText(
      profile.display_name
        ?.charAt(0)
        .toUpperCase() || "?",
      STORY_WIDTH / 2,
      avatarY + avatarSize / 2 + 2
    );
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const displayName =
    profile.display_name || profile.username;

  const nameSize = fitText(
    ctx,
    displayName,
    790,
    54,
    760
  );

  ctx.fillStyle = "#111111";
  ctx.font = `760 ${nameSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

  ctx.fillText(
    displayName,
    STORY_WIDTH / 2,
    458
  );

  ctx.fillStyle = "#777773";
  ctx.font =
    '500 31px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  ctx.fillText(
    `@${profile.username}`,
    STORY_WIDTH / 2,
    510
  );

  /*
   * ========================================================
   * ROTATION LABEL
   * ========================================================
   */

  ctx.fillStyle = "#111111";
  ctx.textAlign = "left";
  ctx.font =
    '760 34px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  ctx.fillText(
    "em rotação",
    100,
    650
  );

  ctx.fillStyle = "#858581";
  ctx.font =
    '500 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  ctx.fillText(
    "as que ficaram por aqui",
    100,
    692
  );

  /*
   * ========================================================
   * FOUR ARTWORKS
   * ========================================================
   */

  const selected = rotation
    .filter(
      (post) => !!post.track.artwork_url
    )
    .slice(0, 4);

  const gap = 24;
  const gridX = 100;
  const gridY = 750;
  const gridWidth = STORY_WIDTH - gridX * 2;
  const coverSize =
    (gridWidth - gap) / 2;

  for (
    let index = 0;
    index < selected.length;
    index++
  ) {
    const post = selected[index];

    const column = index % 2;
    const row = Math.floor(index / 2);

    const x =
      gridX +
      column * (coverSize + gap);

    const y =
      gridY +
      row * (coverSize + gap);

    ctx.fillStyle = "#e7e7e3";

    roundedRect(
      ctx,
      x,
      y,
      coverSize,
      coverSize,
      36
    );

    ctx.fill();

    try {
      const artwork = await loadImage(
        post.track.artwork_url!
      );

      coverCrop(
        ctx,
        artwork,
        x,
        y,
        coverSize,
        36
      );
    } catch {
      // Mantém o placeholder limpo.
    }
  }

  /*
   * Se o perfil ainda não tiver quatro músicas, mantemos
   * os espaços restantes como cards vazios discretos.
   */

  for (
    let index = selected.length;
    index < 4;
    index++
  ) {
    const column = index % 2;
    const row = Math.floor(index / 2);

    const x =
      gridX +
      column * (coverSize + gap);

    const y =
      gridY +
      row * (coverSize + gap);

    ctx.fillStyle = "#ebebe7";

    roundedRect(
      ctx,
      x,
      y,
      coverSize,
      coverSize,
      36
    );

    ctx.fill();

    ctx.fillStyle = "#b9b9b4";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font =
      '500 42px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    ctx.fillText(
      "aux.",
      x + coverSize / 2,
      y + coverSize / 2
    );
  }

  /*
   * ========================================================
   * FOOTER
   * ========================================================
   */

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#111111";
  ctx.font =
    '700 29px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  ctx.fillText(
    `@${profile.username} no aux.`,
    STORY_WIDTH / 2,
    1778
  );

  ctx.fillStyle = "#8a8a86";
  ctx.font =
    '500 22px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  ctx.fillText(
    "música, ligada à vida.",
    STORY_WIDTH / 2,
    1822
  );

  const blob = await canvasToBlob(
    canvas
  );

  const safeUsername =
    profile.username.replace(
      /[^a-z0-9_-]/gi,
      ""
    );

  const file = new File(
    [blob],
    `aux-${safeUsername}.png`,
    {
      type: "image/png",
    }
  );

  if (
    navigator.share &&
    navigator.canShare?.({
      files: [file],
    })
  ) {
    await navigator.share({
      files: [file],
    });

    return "shared";
  }

  downloadBlob(
    blob,
    `aux-${safeUsername}.png`
  );

  return "downloaded";
}
