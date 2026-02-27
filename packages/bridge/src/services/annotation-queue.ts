export class AnnotationQueue<TItem> {
  private queue: TItem[] = [];
  private activeCount = 0;

  constructor(
    private readonly concurrency: number,
    private readonly processItem: (item: TItem) => Promise<void>
  ) {}

  enqueue(item: TItem) {
    this.queue.push(item);
    this.pump();
  }

  clear() {
    this.queue = [];
  }

  private async pump() {
    if (this.activeCount >= this.concurrency) return;

    const item = this.queue.shift();
    if (!item) return;

    this.activeCount++;
    try {
      await this.processItem(item);
    } finally {
      this.activeCount--;
      this.pump();
    }
  }
}
