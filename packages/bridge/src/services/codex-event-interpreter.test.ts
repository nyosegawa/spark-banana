import { describe, expect, it, vi } from 'vitest';
import { interpretCodexEventNotification } from './codex-event-interpreter';

describe('interpretCodexEventNotification', () => {
  function makeContext() {
    return {
      setThreadId: vi.fn(),
      touchActivity: vi.fn(),
      onProgress: vi.fn(),
      onApprovalRequest: vi.fn(),
    };
  }

  it('ignores non codex/event notifications', () => {
    const ctx = makeContext();
    interpretCodexEventNotification({ method: 'other/event', params: {} }, ctx);
    expect(ctx.touchActivity).not.toHaveBeenCalled();
  });

  it('updates thread id and emits progress for known events', () => {
    const ctx = makeContext();
    interpretCodexEventNotification({
      method: 'codex/event',
      params: {
        _meta: { threadId: 'thread-1' },
        msg: { type: 'task_started' },
      },
    }, ctx);

    expect(ctx.setThreadId).toHaveBeenCalledWith('thread-1');
    expect(ctx.touchActivity).toHaveBeenCalled();
    expect(ctx.onProgress).toHaveBeenCalledWith('[status] 処理開始');
  });

  it('normalizes approval command and forwards it', () => {
    const ctx = makeContext();
    interpretCodexEventNotification({
      method: 'codex/event',
      params: {
        msg: {
          type: 'exec_approval_request',
          command: ['/bin/bash', '-lc', 'npm test'],
        },
      },
    }, ctx);

    expect(ctx.onApprovalRequest).toHaveBeenCalledWith('npm test');
  });

  it('ignores silent delta events', () => {
    const ctx = makeContext();
    interpretCodexEventNotification({
      method: 'codex/event',
      params: { msg: { type: 'agent_message_delta' } },
    }, ctx);

    expect(ctx.onProgress).not.toHaveBeenCalled();
  });
});
