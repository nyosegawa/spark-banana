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
  options: {
    mode: 'region';
    useViewportCoords: boolean;
    useCORS: boolean;
    foreignObjectRendering: boolean;
    sanitizeUnsupportedColors: boolean;
    stripStylesheets: boolean;
  },
): Promise<string> {
  const unsupportedColorPattern = /(oklab|oklch)\([^)]*\)/gi;
  const html2canvasOptions: Parameters<typeof html2canvas>[1] = {
    scale: 1,
    useCORS: options.useCORS,
    foreignObjectRendering: options.foreignObjectRendering,
    logging: false,
    backgroundColor: null as string | null,
    imageTimeout: 1500,
    ignoreElements: shouldIgnoreCaptureElement,
    onclone: (options.sanitizeUnsupportedColors || options.stripStylesheets)
      ? (clonedDoc) => {
          if (options.stripStylesheets) {
            clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => el.remove());
            return;
          }

          if (options.sanitizeUnsupportedColors) {
            const styleElements = clonedDoc.querySelectorAll('style');
            for (const styleEl of styleElements) {
              const cssText = styleEl.textContent;
              if (!cssText || !/(oklab|oklch)\(/i.test(cssText)) continue;
              styleEl.textContent = cssText.replace(unsupportedColorPattern, 'rgb(0 0 0 / 0)');
            }

            const inlineStyledElements = clonedDoc.querySelectorAll<HTMLElement>('[style]');
            for (const el of inlineStyledElements) {
              const styleAttr = el.getAttribute('style');
              if (!styleAttr || !/(oklab|oklch)\(/i.test(styleAttr)) continue;
              el.setAttribute('style', styleAttr.replace(unsupportedColorPattern, 'rgb(0 0 0 / 0)'));
            }
          }
        }
      : undefined,
  };

  html2canvasOptions.x = rect.x + (options.useViewportCoords ? 0 : window.scrollX);
  html2canvasOptions.y = rect.y + (options.useViewportCoords ? 0 : window.scrollY);
  html2canvasOptions.width = rect.width;
  html2canvasOptions.height = rect.height;

  const canvas = await html2canvas(target, html2canvasOptions);

  if (!hasVisiblePixels(canvas)) {
    throw new Error('[spark-banana] captureRegion returned empty image');
  }

  return canvas.toDataURL('image/png');
}

async function tryCaptureViewportCrop(
  rect: { x: number; y: number; width: number; height: number },
  options: {
    useCORS: boolean;
    foreignObjectRendering: boolean;
    sanitizeUnsupportedColors: boolean;
    stripStylesheets: boolean;
  },
): Promise<string> {
  const unsupportedColorPattern = /(oklab|oklch)\([^)]*\)/gi;
  const viewportCanvas = await html2canvas(document.body as HTMLElement, {
    x: 0,
    y: 0,
    width: window.innerWidth,
    height: window.innerHeight,
    scale: 1,
    scrollX: -window.scrollX,
    scrollY: -window.scrollY,
    useCORS: options.useCORS,
    foreignObjectRendering: options.foreignObjectRendering,
    logging: false,
    backgroundColor: null,
    imageTimeout: 1500,
    ignoreElements: shouldIgnoreCaptureElement,
    onclone: (options.sanitizeUnsupportedColors || options.stripStylesheets)
      ? (clonedDoc) => {
          if (options.stripStylesheets) {
            clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => el.remove());
            return;
          }

          if (options.sanitizeUnsupportedColors) {
            const styleElements = clonedDoc.querySelectorAll('style');
            for (const styleEl of styleElements) {
              const cssText = styleEl.textContent;
              if (!cssText || !/(oklab|oklch)\(/i.test(cssText)) continue;
              styleEl.textContent = cssText.replace(unsupportedColorPattern, 'rgb(0 0 0 / 0)');
            }

            const inlineStyledElements = clonedDoc.querySelectorAll<HTMLElement>('[style]');
            for (const el of inlineStyledElements) {
              const styleAttr = el.getAttribute('style');
              if (!styleAttr || !/(oklab|oklch)\(/i.test(styleAttr)) continue;
              el.setAttribute('style', styleAttr.replace(unsupportedColorPattern, 'rgb(0 0 0 / 0)'));
            }
          }
        }
      : undefined,
  });

  const crop = document.createElement('canvas');
  crop.width = rect.width;
  crop.height = rect.height;
  const ctx = crop.getContext('2d');
  if (!ctx) throw new Error('[spark-banana] captureRegion crop context unavailable');

  const sx = Math.max(0, Math.floor(rect.x));
  const sy = Math.max(0, Math.floor(rect.y));
  const sw = Math.min(rect.width, Math.max(1, viewportCanvas.width - sx));
  const sh = Math.min(rect.height, Math.max(1, viewportCanvas.height - sy));

  ctx.drawImage(
    viewportCanvas,
    sx,
    sy,
    sw,
    sh,
    0,
    0,
    rect.width,
    rect.height,
  );

  if (!hasVisiblePixels(crop)) {
    throw new Error('[spark-banana] captureRegion returned empty image');
  }

  return crop.toDataURL('image/png');
}

function hasVisiblePixels(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d');
  if (!ctx) return true;
  try {
    const { width, height } = canvas;
    if (width <= 0 || height <= 0) return false;
    const imageData = ctx.getImageData(0, 0, width, height).data;
    const step = Math.max(4, Math.floor((width * height) / 5000) * 4);
    for (let i = 3; i < imageData.length; i += step) {
      if (imageData[i] > 5) return true;
    }
    return false;
  } catch {
    return true;
  }
}

function isUnsupportedColorFunctionError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /unsupported color function|oklab|oklch/i.test(message);
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
  try {
    return await tryCaptureViewportCrop(normalized, {
      useCORS: false,
      foreignObjectRendering: true,
      sanitizeUnsupportedColors: false,
      stripStylesheets: false,
    });
  } catch {
    // fallback to region capture below
  }
  const attempts: Array<{
    target: HTMLElement;
    mode: 'region';
    useViewportCoords: boolean;
    useCORS: boolean;
    foreignObjectRendering: boolean;
    sanitizeUnsupportedColors: boolean;
    stripStylesheets: boolean;
  }> = [
    { target: targets[0], mode: 'region', useViewportCoords: false, useCORS: true, foreignObjectRendering: false, sanitizeUnsupportedColors: false, stripStylesheets: false },
    { target: targets[0], mode: 'region', useViewportCoords: false, useCORS: false, foreignObjectRendering: false, sanitizeUnsupportedColors: false, stripStylesheets: false },
    { target: targets[1], mode: 'region', useViewportCoords: false, useCORS: false, foreignObjectRendering: false, sanitizeUnsupportedColors: false, stripStylesheets: false },
    { target: targets[0], mode: 'region', useViewportCoords: true, useCORS: false, foreignObjectRendering: false, sanitizeUnsupportedColors: false, stripStylesheets: false },
    { target: targets[1], mode: 'region', useViewportCoords: true, useCORS: false, foreignObjectRendering: false, sanitizeUnsupportedColors: false, stripStylesheets: false },
  ].filter((a) => !!a.target);

  let lastError: unknown = null;
  let sawUnsupportedColorFunction = false;
  for (const attempt of attempts) {
    try {
      return await tryCapture(
        attempt.target,
        normalized,
        {
          mode: attempt.mode,
          useViewportCoords: attempt.useViewportCoords,
          useCORS: attempt.useCORS,
          foreignObjectRendering: attempt.foreignObjectRendering,
          sanitizeUnsupportedColors: attempt.sanitizeUnsupportedColors,
          stripStylesheets: attempt.stripStylesheets,
        },
      );
    } catch (err) {
      lastError = err;
      if (isUnsupportedColorFunctionError(err)) {
        sawUnsupportedColorFunction = true;
      }
    }
  }

  const fallbackAttempts: Array<{
    target: HTMLElement;
    mode: 'region';
    useViewportCoords: boolean;
    useCORS: boolean;
    foreignObjectRendering: boolean;
    sanitizeUnsupportedColors: boolean;
    stripStylesheets: boolean;
  }> = [
    { target: targets[0], mode: 'region', useViewportCoords: false, useCORS: false, foreignObjectRendering: true, sanitizeUnsupportedColors: true, stripStylesheets: false },
    { target: targets[0], mode: 'region', useViewportCoords: true, useCORS: false, foreignObjectRendering: true, sanitizeUnsupportedColors: true, stripStylesheets: false },
    { target: targets[1], mode: 'region', useViewportCoords: false, useCORS: false, foreignObjectRendering: true, sanitizeUnsupportedColors: true, stripStylesheets: false },
    { target: targets[1], mode: 'region', useViewportCoords: true, useCORS: false, foreignObjectRendering: true, sanitizeUnsupportedColors: true, stripStylesheets: false },
    { target: targets[0], mode: 'region', useViewportCoords: false, useCORS: false, foreignObjectRendering: true, sanitizeUnsupportedColors: false, stripStylesheets: true },
    { target: targets[0], mode: 'region', useViewportCoords: true, useCORS: false, foreignObjectRendering: true, sanitizeUnsupportedColors: false, stripStylesheets: true },
    { target: targets[1], mode: 'region', useViewportCoords: false, useCORS: false, foreignObjectRendering: true, sanitizeUnsupportedColors: false, stripStylesheets: true },
    { target: targets[1], mode: 'region', useViewportCoords: true, useCORS: false, foreignObjectRendering: true, sanitizeUnsupportedColors: false, stripStylesheets: true },
  ].filter((a) => !!a.target);

  for (const attempt of fallbackAttempts) {
    if (!sawUnsupportedColorFunction && attempt.sanitizeUnsupportedColors) {
      continue;
    }

    try {
      return await tryCapture(
        attempt.target,
        normalized,
        {
          mode: attempt.mode,
          useViewportCoords: attempt.useViewportCoords,
          useCORS: attempt.useCORS,
          foreignObjectRendering: attempt.foreignObjectRendering,
          sanitizeUnsupportedColors: attempt.sanitizeUnsupportedColors,
          stripStylesheets: attempt.stripStylesheets,
        },
      );
    } catch (err) {
      lastError = err;
      if (isUnsupportedColorFunctionError(err)) {
        sawUnsupportedColorFunction = true;
      }
    }
  }

  const msg = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`[spark-banana] captureRegion failed: ${msg}`);
}
