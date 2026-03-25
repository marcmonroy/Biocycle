import { CardData, CardContent } from '../data/cards';

interface CaptureOptions {
  card: CardData;
  content: CardContent;
  userName: string;
  lang: 'en' | 'es';
}

export async function captureCardAsImage({
  card,
  content,
  userName,
  lang,
}: CaptureOptions): Promise<File | null> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  const gradientColors = parseGradient(card.gradient);
  gradientColors.forEach(({ stop, color }) => gradient.addColorStop(stop, color));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const padding = 60;
  const imageSize = width - padding * 2;
  const imageY = 120;

  if (card.image) {
    try {
      const img = await loadImage(card.image);
      ctx.save();
      roundedRect(ctx, padding, imageY, imageSize, imageSize, 24);
      ctx.clip();
      const imgAspect = img.width / img.height;
      let drawWidth = imageSize;
      let drawHeight = imageSize;
      let drawX = padding;
      let drawY = imageY;
      if (imgAspect > 1) {
        drawWidth = imageSize * imgAspect;
        drawX = padding - (drawWidth - imageSize) / 2;
      } else {
        drawHeight = imageSize / imgAspect;
        drawY = imageY - (drawHeight - imageSize) / 2;
      }
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();

      const bannerText = card.bannerFeeling?.[lang]?.replace('{name}', userName) || '';
      if (bannerText) {
        const bannerHeight = 80;
        const bannerY = imageY + imageSize - bannerHeight;
        ctx.save();
        roundedRect(ctx, padding, bannerY, imageSize, bannerHeight, 0);
        ctx.clip();
        ctx.fillStyle = card.accentColor + 'CC';
        ctx.fillRect(padding, bannerY, imageSize, bannerHeight);
        ctx.restore();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 36px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bannerText, width / 2, bannerY + bannerHeight / 2, imageSize - 40);
      }
    } catch {
      drawFallbackScene(ctx, card, padding, imageY, imageSize);
    }
  } else {
    drawFallbackScene(ctx, card, padding, imageY, imageSize);
  }

  const headlineY = imageY + imageSize + 60;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 2;
  wrapText(ctx, content.headline, padding, headlineY, width - padding * 2, 58);
  ctx.shadowColor = 'transparent';

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '28px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('biocycle.app', width / 2, height - 50);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], 'biocycle-card.png', { type: 'image/png' }));
      } else {
        resolve(null);
      }
    }, 'image/png');
  });
}

function parseGradient(gradientStr: string): { stop: number; color: string }[] {
  const match = gradientStr.match(/#[a-fA-F0-9]{6}/g);
  if (!match || match.length < 2) {
    return [
      { stop: 0, color: '#333333' },
      { stop: 1, color: '#111111' },
    ];
  }
  return [
    { stop: 0, color: match[0] },
    { stop: 1, color: match[1] },
  ];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawFallbackScene(
  ctx: CanvasRenderingContext2D,
  card: CardData,
  x: number,
  y: number,
  size: number
) {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  roundedRect(ctx, x, y, size, size, 24);
  ctx.fill();
  ctx.font = '120px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.scene, x + size / 2, y + size / 2);
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[i] + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
}
