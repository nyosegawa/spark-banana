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
      document.body,
      expect.objectContaining({
        x: 25,
        y: 40,
        width: 100,
        height: 60,
        scale: 1,
      })
    );
    expect(toDataURL).toHaveBeenCalledWith('image/png');
  });

  it('ignores overlay elements via ignoreElements callback', async () => {
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
    expect(options.ignoreElements(document.createElement('div'))).toBe(false);
  });
});
