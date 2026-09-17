"use client";

import type { Profile } from "@/types";

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

export type ProfileStoryTrack = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  artwork_url: string | null;
  source_url: string;
};

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

function drawNumberBadge(
  ctx: CanvasRenderingContext2D,
  number: number,
  x: number,
  y: number,
  size = 54
) {
  ctx.save();

  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.beginPath();
  ctx.arc(
    x + size / 2,
    y + size / 2,
    size / 2,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font =
    '800 23px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  ctx.fillText(
    String(number),
    x + size / 2,
    y + size / 2 + 1
  );

  ctx.restore();
}

async function drawStoryTrack(
  ctx: CanvasRenderingContext2D,
  track: ProfileStoryTrack,
  index: number,
  x: number,
  y: number,
  size: number,
  radius: number
) {
  ctx.fillStyle = "#e7e7e3";

  roundedRect(
    ctx,
    x,
    y,
    size,
    size,
    radius
  );

  ctx.fill();

  if (track.artwork_url) {
    try {
      const artwork =
        await loadImage(
          track.artwork_url
        );

      coverCrop(
        ctx,
        artwork,
        x,
        y,
        size,
        radius
      );
    } catch {
      // Mantém o placeholder limpo.
    }
  }

  drawNumberBadge(
    ctx,
    index + 1,
    x + 18,
    y + 18,
    Math.max(
      42,
      Math.min(58, size * 0.13)
    )
  );
}

function drawSoftPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.save();

  ctx.shadowColor = "rgba(38, 31, 26, .08)";
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 18;

  ctx.fillStyle = "rgba(255,255,255,.76)";
  roundedRect(
    ctx,
    x,
    y,
    width,
    height,
    radius
  );
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(17,17,17,.055)";
  roundedRect(
    ctx,
    x,
    y,
    width,
    height,
    radius
  );
  ctx.stroke();

  ctx.restore();
}

function drawAccentLine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number
) {
  const gradient =
    ctx.createLinearGradient(
      x,
      y,
      x + width,
      y
    );

  gradient.addColorStop(
    0,
    "rgba(17,17,17,.72)"
  );
  gradient.addColorStop(
    1,
    "rgba(17,17,17,.06)"
  );

  ctx.save();
  ctx.fillStyle = gradient;
  roundedRect(
    ctx,
    x,
    y,
    width,
    3,
    2
  );
  ctx.fill();
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
  topTracks: ProfileStoryTrack[]
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
   * BACKGROUND — editorial / premium
   * ========================================================
   */

  const background =
    ctx.createLinearGradient(
      0,
      0,
      STORY_WIDTH,
      STORY_HEIGHT
    );

  background.addColorStop(
    0,
    "#f7f5f0"
  );
  background.addColorStop(
    0.52,
    "#f5f4ef"
  );
  background.addColorStop(
    1,
    "#f1f2ee"
  );

  ctx.fillStyle = background;
  ctx.fillRect(
    0,
    0,
    STORY_WIDTH,
    STORY_HEIGHT
  );

  const topGlow =
    ctx.createRadialGradient(
      860,
      250,
      0,
      860,
      250,
      720
    );

  topGlow.addColorStop(
    0,
    "rgba(220,207,238,.34)"
  );
  topGlow.addColorStop(
    .48,
    "rgba(228,219,239,.13)"
  );
  topGlow.addColorStop(
    1,
    "rgba(255,255,255,0)"
  );

  ctx.fillStyle = topGlow;
  ctx.fillRect(
    0,
    0,
    STORY_WIDTH,
    980
  );

  const lowerGlow =
    ctx.createRadialGradient(
      120,
      1320,
      0,
      120,
      1320,
      720
    );

  lowerGlow.addColorStop(
    0,
    "rgba(198,215,222,.25)"
  );
  lowerGlow.addColorStop(
    .52,
    "rgba(214,224,226,.09)"
  );
  lowerGlow.addColorStop(
    1,
    "rgba(255,255,255,0)"
  );

  ctx.fillStyle = lowerGlow;
  ctx.fillRect(
    0,
    760,
    STORY_WIDTH,
    980
  );

  /*
   * ========================================================
   * BRANDING
   * ========================================================
   */

  ctx.fillStyle = "#111111";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font =
    '850 58px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  ctx.fillText(
    "aux.",
    78,
    112
  );

  /*
   * Assinatura no topo.
   */
  ctx.save();

  const brandPillX = 670;
  const brandPillY = 67;
  const brandPillW = 330;
  const brandPillH = 62;

  ctx.fillStyle =
    "rgba(255,255,255,.60)";

  roundedRect(
    ctx,
    brandPillX,
    brandPillY,
    brandPillW,
    brandPillH,
    31
  );
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle =
    "rgba(17,17,17,.055)";
  roundedRect(
    ctx,
    brandPillX,
    brandPillY,
    brandPillW,
    brandPillH,
    31
  );
  ctx.stroke();

  ctx.fillStyle = "#62625e";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font =
    '600 21px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  ctx.fillText(
    "música, ligada à vida.",
    brandPillX +
      brandPillW / 2,
    brandPillY +
      brandPillH / 2 + 1
  );

  ctx.restore();

  /*
   * ========================================================
   * PROFILE
   * ========================================================
   */

  drawSoftPanel(
    ctx,
    100,
    164,
    STORY_WIDTH - 200,
    382,
    44
  );

  const avatarSize = 156;
  const avatarX =
    (STORY_WIDTH - avatarSize) / 2;
  const avatarY = 206;

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

  /*
   * Anel e profundidade da foto.
   */
  ctx.save();
  ctx.beginPath();
  ctx.arc(
    STORY_WIDTH / 2,
    avatarY + avatarSize / 2,
    avatarSize / 2 + 7,
    0,
    Math.PI * 2
  );
  ctx.lineWidth = 8;
  ctx.strokeStyle =
    "rgba(255,255,255,.92)";
  ctx.shadowColor =
    "rgba(0,0,0,.10)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  ctx.stroke();
  ctx.restore();

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
    430
  );

  ctx.fillStyle = "#777773";
  ctx.font =
    '500 31px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  ctx.fillText(
    `@${profile.username}`,
    STORY_WIDTH / 2,
    482
  );

  /*
   * ========================================================
   * TOP DO PERFIL
   * ========================================================
   */

  const selected =
    topTracks.slice(0, 5);

  /*
   * O Top vive dentro de um segundo painel, como uma peça
   * editorial independente do cabeçalho.
   */
  drawSoftPanel(
    ctx,
    72,
    604,
    STORY_WIDTH - 144,
    1002,
    52
  );

  drawAccentLine(
    ctx,
    108,
    692,
    168
  );

  ctx.fillStyle = "#111111";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font =
    '760 34px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  ctx.fillText(
    selected.length
      ? `top ${selected.length}`
      : "meu top",
    108,
    666
  );

  ctx.fillStyle = "#858581";
  ctx.font =
    '500 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  ctx.fillText(
    selected.length
      ? "as que me resumem agora"
      : "ainda escolhendo as minhas",
    108,
    736
  );

  /*
   * TOP 1
   * Uma única escolha vira um destaque editorial.
   */
  if (selected.length === 1) {
    const track = selected[0];
    const size = 500;
    const x =
      (STORY_WIDTH - size) / 2;
    const y = 804;

    await drawStoryTrack(
      ctx,
      track,
      0,
      x,
      y,
      size,
      42
    );

    ctx.fillStyle = "#111111";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    const titleSize = fitText(
      ctx,
      track.title,
      780,
      48,
      760
    );

    ctx.font =
      `760 ${titleSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

    ctx.fillText(
      track.title,
      STORY_WIDTH / 2,
      1372
    );

    ctx.fillStyle = "#575753";
    ctx.font =
      '600 29px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    ctx.fillText(
      track.artist,
      STORY_WIDTH / 2,
      1424
    );

    if (track.album) {
      ctx.fillStyle = "#8a8a86";
      ctx.font =
        '500 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

      ctx.fillText(
        track.album,
        STORY_WIDTH / 2,
        1470
      );
    }
  }

  /*
   * TOP 2–3
   * Capas grandes em uma única fileira.
   */
  if (
    selected.length === 2 ||
    selected.length === 3
  ) {
    const gap = 22;
    const count =
      selected.length;
    const available =
      STORY_WIDTH - 200;
    const size =
      (available -
        gap * (count - 1)) /
      count;
    const y = 842;

    for (
      let index = 0;
      index < count;
      index++
    ) {
      const x =
        100 +
        index * (size + gap);

      await drawStoryTrack(
        ctx,
        selected[index],
        index,
        x,
        y,
        size,
        30
      );
    }
  }

  /*
   * TOP 4
   * Grid 2 × 2, bem próximo do card original.
   */
  if (selected.length === 4) {
    const gap = 24;
    const gridX = 108;
    const gridY = 800;
    const gridWidth =
      STORY_WIDTH - gridX * 2;
    const size =
      (gridWidth - gap) / 2;

    for (
      let index = 0;
      index < 4;
      index++
    ) {
      const column =
        index % 2;
      const row =
        Math.floor(index / 2);

      const x =
        gridX +
        column * (size + gap);

      const y =
        gridY +
        row * (size + gap);

      await drawStoryTrack(
        ctx,
        selected[index],
        index,
        x,
        y,
        size,
        36
      );
    }
  }

  /*
   * TOP 5
   * Mesma linguagem do perfil:
   * #1 grande à esquerda + #2–#5 em 2 × 2.
   */
  if (selected.length === 5) {
    const groupX = 108;
    const groupY = 820;
    const groupWidth =
      STORY_WIDTH - groupX * 2;
    const gap = 24;

    /*
     * L + gap + (2S + gap) = groupWidth
     * L = 2S + gap
     */
    const small =
      (groupWidth -
        gap * 3) /
      4;

    const large =
      small * 2 + gap;

    await drawStoryTrack(
      ctx,
      selected[0],
      0,
      groupX,
      groupY,
      large,
      38
    );

    for (
      let index = 1;
      index < 5;
      index++
    ) {
      const miniIndex =
        index - 1;

      const column =
        miniIndex % 2;

      const row =
        Math.floor(
          miniIndex / 2
        );

      const x =
        groupX +
        large +
        gap +
        column *
          (small + gap);

      const y =
        groupY +
        row *
          (small + gap);

      await drawStoryTrack(
        ctx,
        selected[index],
        index,
        x,
        y,
        small,
        24
      );
    }

    ctx.fillStyle = "#111111";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.font =
      '700 31px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    ctx.fillText(
      selected[0].title,
      groupX,
      groupY + large + 68
    );

    ctx.fillStyle = "#777773";
    ctx.font =
      '500 24px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    ctx.fillText(
      selected[0].artist,
      groupX,
      groupY + large + 110
    );

    ctx.fillStyle = "#9a9a95";
    ctx.font =
      '650 18px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    ctx.fillText(
      "Nº 1 AGORA",
      groupX,
      groupY + large + 154
    );
  }

  /*
   * Nenhuma escolhida: área vazia proposital,
   * sem voltar a usar músicas automáticas dos posts.
   */
  if (!selected.length) {
    const x = 108;
    const y = 818;
    const width =
      STORY_WIDTH - 216;
    const height = 480;

    ctx.fillStyle = "#ebebe7";

    roundedRect(
      ctx,
      x,
      y,
      width,
      height,
      38
    );

    ctx.fill();

    ctx.fillStyle = "#999994";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font =
      '600 30px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    ctx.fillText(
      "as próximas favoritas entram aqui.",
      STORY_WIDTH / 2,
      y + height / 2
    );
  }

  /*
   * ========================================================
   * FOOTER / CTA
   * ========================================================
   */

  ctx.save();

  const footerX = 246;
  const footerY = 1688;
  const footerW = STORY_WIDTH - 492;
  const footerH = 116;

  ctx.fillStyle =
    "rgba(255,255,255,.66)";

  roundedRect(
    ctx,
    footerX,
    footerY,
    footerW,
    footerH,
    58
  );
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle =
    "rgba(17,17,17,.055)";

  roundedRect(
    ctx,
    footerX,
    footerY,
    footerW,
    footerH,
    58
  );
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "#111111";
  ctx.font =
    '750 27px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  ctx.fillText(
    `@${profile.username} no aux.`,
    STORY_WIDTH / 2,
    footerY + 49
  );

  ctx.fillStyle = "#858581";
  ctx.font =
    '500 20px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  ctx.fillText(
    "me encontra por lá.",
    STORY_WIDTH / 2,
    footerY + 82
  );

  ctx.restore();

  ctx.fillStyle = "#aaa9a3";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font =
    '600 18px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

  ctx.fillText(
    "aux. · música, ligada à vida.",
    STORY_WIDTH / 2,
    1860
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
