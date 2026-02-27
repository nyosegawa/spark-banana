import html2canvas from 'html2canvas';

export async function captureRegion(rect: {
  x: number; y: number; width: number; height: number;
}): Promise<string> {
  const canvas = await html2canvas(document.body, {
    x: rect.x + window.scrollX,
    y: rect.y + window.scrollY,
    width: rect.width,
    height: rect.height,
    scale: 1,
    useCORS: true,
    logging: false,
    ignoreElements: (el) => el.closest?.('.sa-overlay') !== null,
  });
  return canvas.toDataURL('image/png');
}
