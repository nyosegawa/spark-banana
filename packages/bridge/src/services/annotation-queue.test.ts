import { describe, expect, it, vi } from 'vitest';
import { AnnotationQueue } from './annotation-queue';

describe('AnnotationQueue', () => {
  it('processes items in FIFO order', async () => {
    const seen: number[] = [];
    const queue = new AnnotationQueue<number>(1, async (item) => {
      seen.push(item);
    });

    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);

    await vi.waitFor(() => {
      expect(seen).toEqual([1, 2, 3]);
    });
  });

  it('respects concurrency setting', async () => {
    let active = 0;
    let maxActive = 0;

    const queue = new AnnotationQueue<number>(2, async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 20));
      active--;
    });

    queue.enqueue(1);
    queue.enqueue(2);
    queue.enqueue(3);
    queue.enqueue(4);

    await vi.waitFor(() => {
      expect(maxActive).toBe(2);
      expect(active).toBe(0);
    });
  });
});
