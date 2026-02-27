/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes from localStorage when value exists', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('light');

    const { result } = renderHook(() => useLocalStorage<'dark' | 'light'>('sa-theme', 'dark'));

    expect(result.current[0]).toBe('light');
  });

  it('falls back to default when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    const { result } = renderHook(() => useLocalStorage<'dark' | 'light'>('sa-theme', 'dark'));

    expect(result.current[0]).toBe('dark');
  });

  it('updates state and writes value to localStorage', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage<'dark' | 'light'>('sa-theme', 'dark'));

    act(() => {
      result.current[1]('light');
    });

    expect(result.current[0]).toBe('light');
    expect(setItemSpy).toHaveBeenCalledWith('sa-theme', 'light');
  });
});
