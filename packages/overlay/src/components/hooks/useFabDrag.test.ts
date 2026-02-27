/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useFabDrag } from './useFabDrag';

function makePointerEvent(x: number, y: number) {
  return {
    clientX: x,
    clientY: y,
    pointerId: 1,
    preventDefault: vi.fn(),
    target: {
      setPointerCapture: vi.fn(),
    },
  } as any;
}

describe('useFabDrag', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1000, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 700, writable: true, configurable: true });
  });

  it('initializes FAB position based on corner preference', () => {
    const { result } = renderHook(() => useFabDrag('bottom-right', vi.fn()));

    expect(result.current.fabReady).toBe(true);
    expect(result.current.fabPos.x).toBe(932);
    expect(result.current.fabPos.y).toBe(632);
  });

  it('treats click without movement as tap', () => {
    const onTap = vi.fn();
    const { result } = renderHook(() => useFabDrag('bottom-left', onTap));

    act(() => {
      result.current.handlePointerDown(makePointerEvent(20, 30));
    });
    act(() => {
      result.current.handlePointerUp();
    });

    expect(onTap).toHaveBeenCalledTimes(1);
    expect(result.current.dragging).toBe(false);
  });

  it('drags and snaps to nearest side without firing tap', () => {
    const onTap = vi.fn();
    const { result } = renderHook(() => useFabDrag('bottom-left', onTap));

    act(() => {
      result.current.handlePointerDown(makePointerEvent(20, 30));
      result.current.handlePointerMove(makePointerEvent(400, 50));
      result.current.handlePointerUp();
    });

    expect(onTap).not.toHaveBeenCalled();
    expect(result.current.fabPos.x).toBe(16);
  });
});
