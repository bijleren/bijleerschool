import QRCode from 'qrcode';

export type BlinkQRSize = 300 | 600 | 1200 | 2400;
export type BlinkQRFormat = 'canvas' | 'dataUrl' | 'blob';

const COLORS = {
  QR_BLUE: '#3366FF',
  TEXT_DARK: '#1e293b',
  QR_DARK: '#000000',
  BACKGROUND: '#ffffff',
};

const PROPORTIONS = {
  PADDING: 0.05,
  BRANDING: 0.10,
  QR_CODE: 0.75,
  CODE_TEXT: 0.10,
};

function formatCode(code: string): string {
  const cleaned = code.replace(/[-\s]/g, '');
  if (cleaned.length >= 10) {
    return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 10)}`;
  }
  return code;
}

function getCodeFontSize(size: BlinkQRSize): number {
  switch (size) {
    case 300: return 22;
    case 600: return 40;
    case 1200: return 80;
    case 2400: return 160;
  }
}

function calculateDimensions(size: BlinkQRSize) {
  const padding = size * PROPORTIONS.PADDING;
  const brandingHeight = size * PROPORTIONS.BRANDING;
  const qrSize = size * PROPORTIONS.QR_CODE;
  const codeHeight = size * PROPORTIONS.CODE_TEXT;

  const totalHeight = brandingHeight + qrSize + codeHeight + (padding * 2.5);

  return {
    width: size,
    height: Math.round(totalHeight),
    padding,
    brandingHeight,
    qrSize,
    codeHeight,
  };
}

async function generateQRCodeDataUrl(code: string, size: number): Promise<string> {
  return QRCode.toDataURL(code, {
    errorCorrectionLevel: 'H',
    margin: 1,
    width: size,
    color: {
      dark: COLORS.QR_DARK,
      light: COLORS.BACKGROUND,
    },
  });
}

export async function generateBlinkQRImage(
  code: string,
  size: BlinkQRSize,
  format: BlinkQRFormat = 'dataUrl'
): Promise<string | HTMLCanvasElement | Blob> {
  const dims = calculateDimensions(size);
  const canvas = document.createElement('canvas');
  canvas.width = dims.width;
  canvas.height = dims.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  ctx.fillStyle = COLORS.BACKGROUND;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let currentY = dims.padding;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const brandingFontSize = Math.max(16, Math.floor(size * 0.055));
  ctx.font = `bold ${brandingFontSize}px Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

  const brandingY = currentY + dims.brandingHeight / 2;
  const centerX = dims.width / 2;

  const blinkText = 'blink';
  const qrText = 'QR';
  const appText = '.app';

  const blinkWidth = ctx.measureText(blinkText).width;
  const qrWidth = ctx.measureText(qrText).width;
  const appWidth = ctx.measureText(appText).width;
  const totalWidth = blinkWidth + qrWidth + appWidth;

  let textX = centerX - totalWidth / 2;

  ctx.fillStyle = COLORS.TEXT_DARK;
  ctx.fillText(blinkText, textX + blinkWidth / 2, brandingY);
  textX += blinkWidth;

  ctx.fillStyle = COLORS.QR_BLUE;
  ctx.fillText(qrText, textX + qrWidth / 2, brandingY);
  textX += qrWidth;

  ctx.fillStyle = COLORS.TEXT_DARK;
  ctx.fillText(appText, textX + appWidth / 2, brandingY);

  currentY += dims.brandingHeight;

  const qrDataUrl = await generateQRCodeDataUrl(code, dims.qrSize);
  const qrImage = new Image();

  await new Promise<void>((resolve, reject) => {
    qrImage.onload = () => resolve();
    qrImage.onerror = reject;
    qrImage.src = qrDataUrl;
  });

  const qrX = (dims.width - dims.qrSize) / 2;
  ctx.drawImage(qrImage, qrX, currentY, dims.qrSize, dims.qrSize);
  currentY += dims.qrSize;

  const formattedCode = formatCode(code);
  const codeFontSize = getCodeFontSize(size);
  ctx.font = `${codeFontSize}px 'Courier New', Courier, monospace`;
  ctx.fillStyle = COLORS.TEXT_DARK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const codeY = currentY + dims.codeHeight / 2;
  ctx.fillText(formattedCode, centerX, codeY);

  if (format === 'canvas') {
    return canvas;
  }

  if (format === 'dataUrl') {
    return canvas.toDataURL('image/png');
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, 'image/png');
  });
}

export function downloadBlinkQR(code: string, size: BlinkQRSize, dataUrl: string): void {
  const link = document.createElement('a');
  const formattedCode = formatCode(code).replace('-', '');
  link.download = `blinkqr-${formattedCode}-${size}px.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const qrCache = new Map<string, string>();

export async function getCachedBlinkQR(
  code: string,
  size: BlinkQRSize
): Promise<string> {
  const cacheKey = `${code}-${size}`;

  if (qrCache.has(cacheKey)) {
    return qrCache.get(cacheKey)!;
  }

  const dataUrl = await generateBlinkQRImage(code, size, 'dataUrl') as string;
  qrCache.set(cacheKey, dataUrl);

  return dataUrl;
}

export function clearQRCache(): void {
  qrCache.clear();
}
