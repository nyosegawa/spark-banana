/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import html2canvas from 'html2canvas';
import { captureRegion } from './screen-capture';

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

describe('captureRegion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'scrollX', { value: 5, configurable: true });
    Object.defineProperty(window, 'scrollY', { value: 10, configurable: true });
  });

  it('captures a region and returns png data URL', async () => {
    const toDataURL = vi.fn().mockReturnValue('data:image/png;base64,TEST');
    (html2canvas as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ toDataURL });

    const result = await captureRegion({ x: 20, y: 30, width: 100, height: 60 });

    expect(result).toBe('data:image/png;base64,TEST');
    expect(html2canvas).toHaveBeenCalledWith(
      document.documentElement,
      expect.objectContaining({
        x: 25,
        y: 40,
        width: 100,
        height: 60,
        scale: 1,
        useCORS: true,
      })
    );
    expect(toDataURL).toHaveBeenCalledWith('image/png');
  });

  it('ignores overlay and non-capturable elements via ignoreElements callback', async () => {
    const toDataURL = vi.fn().mockReturnValue('data:image/png;base64,TEST');
    (html2canvas as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ toDataURL });

    await captureRegion({ x: 0, y: 0, width: 10, height: 10 });

    const options = (html2canvas as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    const overlay = document.createElement('div');
    overlay.className = 'sa-overlay';
    const child = document.createElement('span');
    overlay.appendChild(child);

    expect(options.ignoreElements(overlay)).toBe(true);
    expect(options.ignoreElements(child)).toBe(true);
    const iframe = document.createElement('iframe');
    expect(options.ignoreElements(iframe)).toBe(true);
    const canvas = document.createElement('canvas');
    expect(options.ignoreElements(canvas)).toBe(true);
    const imgExternal = document.createElement('img');
    imgExternal.src = 'https://cdn.example.com/x.png';
    expect(options.ignoreElements(imgExternal)).toBe(true);
    const imgData = document.createElement('img');
    imgData.src = 'data:image/png;base64,AAAA';
    expect(options.ignoreElements(imgData)).toBe(false);
    expect(options.ignoreElements(document.createElement('div'))).toBe(false);
  });

  it('retries capture with relaxed CORS settings when first attempt fails', async () => {
    const toDataURL = vi.fn().mockReturnValue('data:image/png;base64,RETRY');
    (html2canvas as unknown as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('first failed'))
      .mockResolvedValueOnce({ toDataURL });

    const result = await captureRegion({ x: 1, y: 2, width: 30, height: 40 });

    expect(result).toBe('data:image/png;base64,RETRY');
    const calls = (html2canvas as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(calls[0][1].useCORS).toBe(true);
    expect(calls[1][1].useCORS).toBe(false);
  });

  it('retries with foreignObjectRendering when css color parsing fails', async () => {
    const toDataURL = vi.fn().mockReturnValue('data:image/png;base64,FALLBACK');
    (html2canvas as unknown as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('unsupported color function "oklab"'))
      .mockRejectedValueOnce(new Error('unsupported color function "oklab"'))
      .mockRejectedValueOnce(new Error('unsupported color function "oklab"'))
      .mockResolvedValueOnce({ toDataURL });

    const result = await captureRegion({ x: 5, y: 6, width: 40, height: 20 });

    expect(result).toBe('data:image/png;base64,FALLBACK');
    const calls = (html2canvas as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls).toHaveLength(4);
    expect(calls[0][1].foreignObjectRendering).toBe(false);
    expect(calls[1][1].foreignObjectRendering).toBe(false);
    expect(calls[2][1].foreignObjectRendering).toBe(false);
    expect(calls[3][1].foreignObjectRendering).toBe(true);
  });
});
