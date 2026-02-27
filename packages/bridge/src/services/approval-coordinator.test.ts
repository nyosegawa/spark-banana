import { describe, expect, it, vi } from 'vitest';
import { ApprovalCoordinator } from './approval-coordinator';

describe('ApprovalCoordinator', () => {
  it('resolves pending approval by annotation id', async () => {
    const coordinator = new ApprovalCoordinator();
    const emit = vi.fn();

    const approvalPromise = coordinator.request('a1', emit);
    expect(emit).toHaveBeenCalledTimes(1);

    expect(coordinator.resolve('a1', true)).toBe(true);
    await expect(approvalPromise).resolves.toBe(true);
  });

  it('returns false when resolving unknown annotation id', () => {
    const coordinator = new ApprovalCoordinator();
    expect(coordinator.resolve('missing', true)).toBe(false);
  });

  it('auto-denies previous pending request when same id is requested again', async () => {
    const coordinator = new ApprovalCoordinator();

    const first = coordinator.request('a2', () => {});
    const second = coordinator.request('a2', () => {});

    await expect(first).resolves.toBe(false);

    coordinator.resolve('a2', true);
    await expect(second).resolves.toBe(true);
  });

  it('clears all pending approvals with default value', async () => {
    const coordinator = new ApprovalCoordinator();

    const p1 = coordinator.request('x1', () => {});
    const p2 = coordinator.request('x2', () => {});

    coordinator.clearAll(false);

    await expect(p1).resolves.toBe(false);
    await expect(p2).resolves.toBe(false);
  });
});
