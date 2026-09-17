import type { Post } from "@/types";

/*
 * =========================================================
 * AUX STORY CARD
 *
 * Review:
 * artwork central + 5 estrelas + texto centralizado
 *
 * Memory:
 * fotografia protagonista + artwork sobreposto
 * =========================================================
 */

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

const WHITE = "#ffffff";
const SOFT_WHITE = "rgba(255,255,255,0.72)";
const DIM_WHITE = "rgba(255,255,255,0.42)";

/*
 * =========================================================
 * IMAGE LOADER
 * =========================================================
 */

function loadImage(
  src: string
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.crossOrigin = "anonymous";

    image.onload = () => resolve(image);
    image.onerror = reject;

    image.src =
      `/api/image-proxy?url=${encodeURIComponent(src)}`;
  });
}

/*
 * =========================================================
 * ROUNDED IMAGE
 * =========================================================
 */

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const scale = Math.max(
    width / image.width,
    height / image.height
  );

  const drawWidth =
    image.width * scale;

  const drawHeight =
    image.height * scale;

  const drawX =
    x + (width - drawWidth) / 2;

  const drawY =
    y + (height - drawHeight) / 2;

  ctx.save();

  ctx.beginPath();

  ctx.roundRect(
    x,
    y,
    width,
    height,
    radius
  );

  ctx.clip();

  ctx.drawImage(
    image,
    drawX,
    drawY,
    drawWidth,
    drawHeight
  );

  ctx.restore();
}

/*
 * =========================================================
 * SHADOW
 * =========================================================
 */

function withShadow(
  ctx: CanvasRenderingContext2D,
  callback: () => void
) {
  ctx.save();

  ctx.shadowColor =
    "rgba(0,0,0,0.45)";

  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 18;

  callback();

  ctx.restore();
}

/*
 * =========================================================
 * TEXT WRAPPING
 * =========================================================
 */

function getWrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = 5
) {
  const words = text
    .trim()
    .split(/\s+/);

  const lines: string[] = [];

  let current = "";

  for (const word of words) {
    const test = current
      ? `${current} ${word}`
      : word;

    if (
      ctx.measureText(test).width >
        maxWidth &&
      current
    ) {
      lines.push(current);

      current = word;

      if (
        lines.length ===
        maxLines - 1
      ) {
        break;
      }
    } else {
      current = test;
    }
  }

  if (
    current &&
    lines.length < maxLines
  ) {
    lines.push(current);
  }

  return lines;
}

function drawCenteredWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 5
) {
  const lines = getWrappedLines(
    ctx,
    text,
    maxWidth,
    maxLines
  );

  lines.forEach(
    (line, index) => {
      ctx.fillText(
        line,
        centerX,
        startY +
          index * lineHeight
      );
    }
  );

  return (
    startY +
    lines.length * lineHeight
  );
}

/*
 * =========================================================
 * BACKGROUND
 * =========================================================
 */

async function drawAmbientBackground(
  ctx: CanvasRenderingContext2D,
  artworkUrl?: string | null
) {
  /*
   * Base neutra.
   */

  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      STORY_WIDTH,
      STORY_HEIGHT
    );

  gradient.addColorStop(
    0,
    "#111111"
  );

  gradient.addColorStop(
    0.55,
    "#181818"
  );

  gradient.addColorStop(
    1,
    "#242321"
  );

  ctx.fillStyle = gradient;

  ctx.fillRect(
    0,
    0,
    STORY_WIDTH,
    STORY_HEIGHT
  );

  /*
   * Artwork vira uma ambient color
   * muito sutil no fundo.
   */

  if (!artworkUrl) return;

  try {
    const artwork =
      await loadImage(artworkUrl);

    ctx.save();

    ctx.globalAlpha = 0.17;

    ctx.filter =
      "blur(110px) saturate(1.25)";

    const scale = Math.max(
      STORY_WIDTH /
        artwork.width,
      STORY_HEIGHT /
        artwork.height
    );

    const width =
      artwork.width * scale;

    const height =
      artwork.height * scale;

    ctx.drawImage(
      artwork,
      (STORY_WIDTH - width) / 2,
      (STORY_HEIGHT - height) /
        2,
      width,
      height
    );

    ctx.restore();

    /*
     * Camada escura para preservar
     * contraste.
     */

    ctx.fillStyle =
      "rgba(10,10,10,0.60)";

    ctx.fillRect(
      0,
      0,
      STORY_WIDTH,
      STORY_HEIGHT
    );
  } catch {
    // Fundo neutro continua funcionando.
  }
}

/*
 * =========================================================
 * AUX LOGO
 * =========================================================
 */

function drawLogo(
  ctx: CanvasRenderingContext2D
) {
  ctx.save();

  ctx.fillStyle = WHITE;

  ctx.font =
    "700 58px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

  ctx.textAlign = "left";

  ctx.fillText(
    "aux.",
    72,
    112
  );

  ctx.restore();
}

/*
 * =========================================================
 * USERNAME
 * =========================================================
 */

function drawUsername(
  ctx: CanvasRenderingContext2D,
  username: string
) {
  ctx.save();

  ctx.fillStyle = SOFT_WHITE;

  ctx.font =
    "500 30px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

  ctx.textAlign = "center";

  ctx.fillText(
    `@${username}`,
    STORY_WIDTH / 2,
    1810
  );

  ctx.restore();
}

/*
 * =========================================================
 * FIVE STAR RATING
 *
 * Sempre desenha 5 estrelas.
 * A nota controla quanto de cada estrela
 * fica iluminado.
 * =========================================================
 */

function drawRatingStars(
  ctx: CanvasRenderingContext2D,
  rating: number,
  centerX: number,
  y: number
) {
  const starSize = 54;
  const gap = 18;

  const totalWidth =
    starSize * 5 +
    gap * 4;

  const startX =
    centerX - totalWidth / 2;

  ctx.save();

  ctx.font =
    `500 ${starSize}px -apple-system, BlinkMacSystemFont, system-ui, sans-serif`;

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  for (
    let index = 0;
    index < 5;
    index++
  ) {
    const x =
      startX +
      index *
        (starSize + gap);

    /*
     * Estrela apagada.
     */

    ctx.fillStyle =
      "rgba(255,255,255,0.22)";

    ctx.fillText(
      "★",
      x,
      y
    );

    const value =
      Math.max(
        0,
        Math.min(
          1,
          rating - index
        )
      );

    if (value <= 0) {
      continue;
    }

    /*
     * Estrela preenchida.
     *
     * Para 4.5, a quinta estrela
     * fica metade preenchida.
     */

    ctx.save();

    ctx.beginPath();

    ctx.rect(
      x,
      y -
        starSize,
      starSize * value,
      starSize * 1.4
    );

    ctx.clip();

    ctx.fillStyle = WHITE;

    ctx.fillText(
      "★",
      x,
      y
    );

    ctx.restore();
  }

  ctx.restore();
}

/*
 * =========================================================
 * REVIEW STORY
 * =========================================================
 */

async function drawReviewStory(
  ctx: CanvasRenderingContext2D,
  post: Post
) {
  const artworkUrl =
    post.track.artwork_url;

  /*
   * ARTWORK
   */

  if (artworkUrl) {
    try {
      const artwork =
        await loadImage(
          artworkUrl
        );

      const size = 650;

      const x =
        (STORY_WIDTH - size) /
        2;

      const y = 245;

      withShadow(
        ctx,
        () => {
          drawCoverImage(
            ctx,
            artwork,
            x,
            y,
            size,
            size,
            46
          );
        }
      );
    } catch {
      // Continua sem artwork.
    }
  }

  /*
   * TRACK
   */

  ctx.save();

  ctx.textAlign = "center";

  ctx.fillStyle = WHITE;

  ctx.font =
    "700 48px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

  const title =
    post.track.title.length >
    34
      ? `${post.track.title.slice(
          0,
          33
        )}…`
      : post.track.title;

  ctx.fillText(
    title,
    STORY_WIDTH / 2,
    985
  );

  ctx.fillStyle =
    SOFT_WHITE;

  ctx.font =
    "400 30px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

  const artist =
    post.track.artist.length >
    46
      ? `${post.track.artist.slice(
          0,
          45
        )}…`
      : post.track.artist;

  ctx.fillText(
    artist,
    STORY_WIDTH / 2,
    1034
  );

  ctx.restore();

  /*
   * 5 ESTRELAS
   */

  if (post.rating) {
    drawRatingStars(
      ctx,
      post.rating,
      STORY_WIDTH / 2,
      1115
    );
  }

  /*
   * REVIEW
   */

  ctx.save();

  ctx.textAlign = "center";

  ctx.fillStyle =
    "rgba(255,255,255,0.94)";

  ctx.font =
    "500 34px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

  const body =
    `“${post.body.slice(
      0,
      220
    )}”`;

  drawCenteredWrappedText(
    ctx,
    body,
    STORY_WIDTH / 2,
    1245,
    790,
    48,
    5
  );

  ctx.restore();
}

/*
 * =========================================================
 * MEMORY STORY
 * =========================================================
 */
async function drawMemoryStory(
  ctx: CanvasRenderingContext2D,
  post: Post
) {
  const photoUrl =
    post.media[0]?.public_url;

  const artworkUrl =
    post.track.artwork_url;

  /*
   * =====================================================
   * 1. FOTO / MOMENTO
   * =====================================================
   */

  if (photoUrl) {
    try {
      const photo =
        await loadImage(photoUrl);

      withShadow(ctx, () => {
        drawCoverImage(
          ctx,
          photo,
          90,
          210,
          900,
          980,
          52
        );
      });
    } catch {
      // O card continua funcionando sem foto.
    }
  }

  /*
   * =====================================================
   * 2. MUSIC ATTACHMENT
   *
   * Pequeno card que parece estar fisicamente
   * conectado à fotografia.
   * =====================================================
   */

  const playerX = 150;
  const playerY = 1095;
  const playerWidth = 780;
  const playerHeight = 205;

  ctx.save();

  ctx.shadowColor =
    "rgba(0,0,0,0.45)";

  ctx.shadowBlur = 45;
  ctx.shadowOffsetY = 16;

  ctx.fillStyle =
    "rgba(22,22,22,0.94)";

  ctx.beginPath();

  ctx.roundRect(
    playerX,
    playerY,
    playerWidth,
    playerHeight,
    40
  );

  ctx.fill();

  ctx.restore();

  /*
   * Borda extremamente sutil.
   */

  ctx.save();

  ctx.strokeStyle =
    "rgba(255,255,255,0.10)";

  ctx.lineWidth = 2;

  ctx.beginPath();

  ctx.roundRect(
    playerX,
    playerY,
    playerWidth,
    playerHeight,
    40
  );

  ctx.stroke();

  ctx.restore();

  /*
   * =====================================================
   * 3. ARTWORK
   * =====================================================
   */

  if (artworkUrl) {
    try {
      const artwork =
        await loadImage(
          artworkUrl
        );

      drawCoverImage(
        ctx,
        artwork,
        playerX + 22,
        playerY + 22,
        161,
        161,
        26
      );
    } catch {
      // Continua sem artwork.
    }
  }

  /*
   * =====================================================
   * 4. MÚSICA
   * =====================================================
   */

  const textX =
    playerX + 215;

  ctx.save();

  ctx.textAlign = "left";

  /*
   * pequena identificação
   */

  ctx.fillStyle =
    "rgba(255,255,255,0.45)";

  ctx.font =
    "500 22px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

  ctx.fillText(
    "♫  estava tocando",
    textX,
    playerY + 48
  );

  /*
   * título
   */

  ctx.fillStyle = WHITE;

  ctx.font =
    "700 38px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

  const title =
    post.track.title.length > 28
      ? `${post.track.title.slice(
          0,
          27
        )}…`
      : post.track.title;

  ctx.fillText(
    title,
    textX,
    playerY + 103
  );

  /*
   * artista
   */

  ctx.fillStyle =
    "rgba(255,255,255,0.64)";

  ctx.font =
    "400 27px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

  const artist =
    post.track.artist.length > 38
      ? `${post.track.artist.slice(
          0,
          37
        )}…`
      : post.track.artist;

  ctx.fillText(
    artist,
    textX,
    playerY + 147
  );

  ctx.restore();

  /*
   * =====================================================
   * 5. TEXTO DA MEMORY
   * =====================================================
   */

  ctx.save();

  ctx.textAlign = "center";

  ctx.fillStyle =
    "rgba(255,255,255,0.95)";

  ctx.font =
    "500 34px -apple-system, BlinkMacSystemFont, system-ui, sans-serif";

  const memoryText =
    post.body.length > 220
      ? `${post.body.slice(
          0,
          217
        )}…`
      : post.body;

  drawCenteredWrappedText(
    ctx,
    `“${memoryText}”`,
    STORY_WIDTH / 2,
    1410,
    800,
    48,
    5
  );

  ctx.restore();
}

/*
 * =========================================================
 * GERAR PNG
 * =========================================================
 */

export async function drawStoryPng(
  post: Post
) {
  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    STORY_WIDTH;

  canvas.height =
    STORY_HEIGHT;

  const ctx =
    canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Não consegui criar o Story Card."
    );
  }

  /*
   * Fundo.
   */

  await drawAmbientBackground(
    ctx,
    post.track.artwork_url
  );

  /*
   * Marca.
   */

  drawLogo(ctx);

  /*
   * Conteúdo.
   */

  if (
    post.type === "review"
  ) {
    await drawReviewStory(
      ctx,
      post
    );
  } else {
    await drawMemoryStory(
      ctx,
      post
    );
  }

  /*
   * Username.
   */

  drawUsername(
    ctx,
    post.author.username
  );

  /*
   * Export.
   */

  const blob =
    await new Promise<Blob>(
      (resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(
                new Error(
                  "Não consegui gerar o PNG."
                )
              );
            }
          },
          "image/png",
          1
        );
      }
    );

  return new File(
    [blob],
    `aux-${post.id}.png`,
    {
      type: "image/png",
    }
  );
}

/*
 * =========================================================
 * COMPARTILHAR / BAIXAR
 * =========================================================
 */

export async function shareStoryCard(
  post: Post
) {
  const file =
    await drawStoryPng(post);

  /*
   * Mobile:
   * tenta usar o Share Sheet nativo.
   */

  if (
    typeof navigator !==
      "undefined" &&
    navigator.share &&
    navigator.canShare?.({
      files: [file],
    })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: "aux.",
      });

      return "shared" as const;
    } catch (error) {
      if (
        error instanceof
          DOMException &&
        error.name ===
          "AbortError"
      ) {
        return "cancelled" as const;
      }

      throw error;
    }
  }

  /*
   * Desktop/fallback:
   * baixa o PNG.
   */

  const url =
    URL.createObjectURL(
      file
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;
  link.download = file.name;

  document.body.appendChild(
    link
  );

  link.click();
  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(
      url
    );
  }, 1000);

  return "downloaded" as const;
}