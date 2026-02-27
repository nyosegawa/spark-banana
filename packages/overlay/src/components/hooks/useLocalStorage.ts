import { useState, useCallback } from 'react';

export function useLocalStorage<T extends string>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try { return (localStorage.getItem(key) as T) || defaultValue; } catch { return defaultValue; }
  });

  const set = useCallback((next: T) => {
    setValue(next);
    try { localStorage.setItem(key, next); } catch { /* */ }
  }, [key]);

  return [value, set];
}
