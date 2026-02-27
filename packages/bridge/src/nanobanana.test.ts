import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Nanobanana } from './nanobanana';

describe('Nanobanana', () => {
  const originalKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  });

  it('throws when API key is missing', () => {
    delete process.env.GEMINI_API_KEY;
    expect(() => new Nanobanana()).toThrow(/API key is required/);
  });

  it('analyze returns a suggestion when Gemini returns image + text', async () => {
    process.env.GEMINI_API_KEY = 'test-key';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  { text: 'Improved spacing and contrast.' },
                  { inlineData: { mimeType: 'image/png', data: 'AAAA' } },
                ],
              },
              finishReason: 'STOP',
            },
          ],
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const banana = new Nanobanana();
    const onProgress = vi.fn();
    const suggestions = await banana.analyze(
      'data:image/png;base64,BBBB',
      'make it modern',
      onProgress,
      1
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].title).toBe('Option A');
    expect(suggestions[0].description).toContain('Improved spacing');
    expect(suggestions[0].image).toBe('data:image/png;base64,AAAA');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(':generateContent');
    expect(onProgress).toHaveBeenCalledWith(expect.stringContaining('Generating UI variation'));
  });

  it('analyze throws when all variations fail', async () => {
    process.env.GEMINI_API_KEY = 'test-key';

    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const banana = new Nanobanana();
    await expect(
      banana.analyze('data:image/png;base64,BBBB', 'make it modern')
    ).rejects.toThrow(/All image generations failed/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('describeDiff returns parsed text output', async () => {
    process.env.GEMINI_API_KEY = 'test-key';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '1. Background changed to #111.' }],
              },
            },
          ],
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const banana = new Nanobanana();
    const result = await banana.describeDiff(
      'data:image/png;base64,ORIG',
      'data:image/png;base64,TARGET',
      'darken the UI'
    );

    expect(result).toContain('Background changed');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('describeDiff throws on empty response text', async () => {
    process.env.GEMINI_API_KEY = 'test-key';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: '' }],
              },
            },
          ],
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const banana = new Nanobanana();
    await expect(
      banana.describeDiff('data:image/png;base64,ORIG', 'data:image/png;base64,TARGET', 'x')
    ).rejects.toThrow(/empty text/);
  });
});
