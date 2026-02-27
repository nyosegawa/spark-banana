import html2canvas from 'html2canvas';

function isSameOriginResourceUrl(src: string): boolean {
  if (src.startsWith('data:') || src.startsWith('blob:')) return true;
  try {
    return new URL(src, window.location.href).origin === window.location.origin;
  } catch {
    return true;
  }
}

function shouldIgnoreCaptureElement(el: Element): boolean {
  if (el.closest?.('.sa-overlay')) return true;
  if (el instanceof HTMLIFrameElement) return true;
  if (el instanceof HTMLVideoElement) return true;
  if (el instanceof HTMLCanvasElement) return true;
  if (el instanceof HTMLImageElement) {
    const src = el.currentSrc || el.getAttribute('src') || '';
    if (src && !isSameOriginResourceUrl(src)) return true;
  }
  return false;
}

async function tryCapture(
  target: HTMLElement,
  rect: { x: number; y: number; width: number; height: number },
  useCORS: boolean,
): Promise<string> {
  const canvas = await html2canvas(target, {
    x: rect.x + window.scrollX,
    y: rect.y + window.scrollY,
    width: rect.width,
    height: rect.height,
    scale: 1,
    useCORS,
    logging: false,
    backgroundColor: null,
    imageTimeout: 1500,
    ignoreElements: shouldIgnoreCaptureElement,
  });
  return canvas.toDataURL('image/png');
}

export async function captureRegion(rect: {
  x: number; y: number; width: number; height: number;
}): Promise<string> {
  const normalized = {
    x: Math.max(0, Math.floor(rect.x)),
    y: Math.max(0, Math.floor(rect.y)),
    width: Math.max(1, Math.floor(rect.width)),
    height: Math.max(1, Math.floor(rect.height)),
  };
  const targets = [document.documentElement as HTMLElement, document.body as HTMLElement]
    .filter((t): t is HTMLElement => !!t);
  const attempts: Array<{ target: HTMLElement; useCORS: boolean }> = [
    { target: targets[0], useCORS: true },
    { target: targets[0], useCORS: false },
    { target: targets[1], useCORS: false },
  ].filter((a) => !!a.target);

  let lastError: unknown = null;
  for (const attempt of attempts) {
    try {
      return await tryCapture(attempt.target, normalized, attempt.useCORS);
    } catch (err) {
      lastError = err;
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`[spark-banana] captureRegion failed: ${msg}`);
}
