/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useBanana } from './useBanana';
import { captureRegion } from '../../core/screen-capture';
import { captureElementsInRegion } from '../../core/selector-engine';

vi.mock('../../core/screen-capture', () => ({
  captureRegion: vi.fn().mockResolvedValue('data:image/png;base64,SHOT'),
}));

vi.mock('../../core/selector-engine', () => ({
  captureElementsInRegion: vi.fn().mockReturnValue('- button.submit'),
}));

function makeMouseEvent(x: number, y: number) {
  return {
    clientX: x,
    clientY: y,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: {
      closest: vi.fn().mockReturnValue(null),
    },
  } as any;
}

describe('useBanana', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (captureRegion as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('data:image/png;base64,SHOT');
    (captureElementsInRegion as unknown as ReturnType<typeof vi.fn>).mockReturnValue('- button.submit');
    const store: Record<string, string> = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => store[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      store[key] = value;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not send request when required fields are missing', () => {
    const sendBananaRequest = vi.fn();
    const { result } = renderHook(() => useBanana(sendBananaRequest, vi.fn(), vi.fn()));

    act(() => {
      result.current.send();
    });

    expect(sendBananaRequest).not.toHaveBeenCalled();
  });

  it('captures region and sends banana request when input is complete', async () => {
    const sendBananaRequest = vi.fn();
    const setPanelOpen = vi.fn();

    const { result } = renderHook(() => useBanana(sendBananaRequest, vi.fn(), setPanelOpen));

    act(() => {
      result.current.setApiKeyInput(' test-key ');
    });
    act(() => {
      result.current.saveApiKey();
    });
    act(() => {
      result.current.setInstruction('Make this cleaner');
    });
    act(() => {
      result.current.handleMouseDown(makeMouseEvent(10, 10), true);
      result.current.handleMouseMove(makeMouseEvent(120, 80));
    });

    await act(async () => {
      await result.current.handleMouseUp(makeMouseEvent(120, 80));
    });
    await waitFor(() => expect(result.current.screenshot).toBeTruthy());
    expect(result.current.apiKey).toBe('test-key');

    act(() => {
      result.current.send(false);
    });

    expect(captureRegion).toHaveBeenCalledWith({ x: 10, y: 10, width: 110, height: 70 });
    expect(captureElementsInRegion).toHaveBeenCalledWith({ x: 10, y: 10, width: 110, height: 70 });
    expect(setPanelOpen).toHaveBeenCalledWith(true);
    expect(sendBananaRequest).toHaveBeenCalledTimes(1);

    const [request, apiKey, model, fast] = sendBananaRequest.mock.calls[0];
    expect(request.screenshot).toBe('data:image/png;base64,SHOT');
    expect(request.instruction).toBe('Make this cleaner');
    expect(request.regionElements).toBe('- button.submit');
    expect(apiKey).toBe('test-key');
    expect(model).toBeTypeOf('string');
    expect(fast).toBe(false);
  });

  it('deduplicates progress logs in onProgress callback', async () => {
    const { result } = renderHook(() => useBanana(vi.fn(), vi.fn(), vi.fn()));

    act(() => {
      result.current.setApiKeyInput('test-key');
    });
    act(() => {
      result.current.saveApiKey();
    });
    act(() => {
      result.current.setInstruction('Improve spacing');
    });
    act(() => {
      result.current.handleMouseDown(makeMouseEvent(10, 10), true);
      result.current.handleMouseMove(makeMouseEvent(120, 80));
    });

    await act(async () => {
      await result.current.handleMouseUp(makeMouseEvent(120, 80));
    });

    await waitFor(() => expect(result.current.screenshot).toBeTruthy());
    act(() => {
      result.current.send(false);
    });
    await waitFor(() => expect(result.current.jobs.length).toBeGreaterThan(0));
    const jobId = result.current.jobs[0].id;

    act(() => {
      result.current.onProgress(jobId!, 'step-1');
      result.current.onProgress(jobId!, 'step-1');
      result.current.onProgress(jobId!, 'step-2');
    });

    const job = result.current.jobs.find((j) => j.id === jobId);
    expect(job?.logs).toEqual(['step-1', 'step-2']);
  });

  it('keeps panel open and exposes captureError when screenshot capture fails', async () => {
    const setPanelOpen = vi.fn();
    (captureRegion as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('capture boom'));

    const { result } = renderHook(() => useBanana(vi.fn(), vi.fn(), setPanelOpen));

    act(() => {
      result.current.handleMouseDown(makeMouseEvent(10, 10), true);
      result.current.handleMouseMove(makeMouseEvent(120, 80));
    });

    await act(async () => {
      await result.current.handleMouseUp(makeMouseEvent(120, 80));
    });

    expect(result.current.screenshot).toBeNull();
    expect(result.current.captureError).toContain('capture boom');
    expect(setPanelOpen).toHaveBeenCalledWith(true);
  });
});
