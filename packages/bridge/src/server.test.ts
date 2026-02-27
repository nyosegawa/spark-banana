import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import type { Annotation, ServerMessage, ClientMessage } from './types';

let mockCodexInstances: any[] = [];

// Mock CodexMcp as a proper class to avoid "not a constructor" error
vi.mock('./codex-mcp', () => {
  class MockCodexMcp {
    config: any;
    constructor(config: any) {
      this.config = config;
      mockCodexInstances.push(this);
    }
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
    restart = vi.fn().mockResolvedValue(undefined);
    setModel = vi.fn();
    execute = vi.fn().mockResolvedValue({
      success: true,
      output: 'Mock output',
      durationMs: 100,
      threadId: 'mock-thread',
    });
    reply = vi.fn().mockResolvedValue({
      success: true,
      output: 'Mock reply output',
      durationMs: 100,
      threadId: 'mock-thread',
    });
  }
  return { CodexMcp: MockCodexMcp };
});

import { BridgeServer } from './server';

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: `ann-${Date.now()}`,
    timestamp: Date.now(),
    comment: 'Fix this',
    type: 'click',
    status: 'pending',
    element: {
      selector: '#test',
      genericSelector: 'div.test',
      fullPath: 'body > div.test',
      tagName: 'div',
      textContent: 'Test',
      cssClasses: ['test'],
      attributes: {},
      boundingBox: { x: 0, y: 0, width: 100, height: 50 },
      parentSelector: 'body',
      nearbyText: '[Test]',
    },
    ...overrides,
  };
}

function waitForMessage(ws: WebSocket): Promise<ServerMessage> {
  return new Promise((resolve) => {
    ws.once('message', (data) => {
      resolve(JSON.parse(data.toString()));
    });
  });
}

function waitForMessageType<T extends ServerMessage['type']>(
  ws: WebSocket,
  type: T,
  predicate?: (msg: Extract<ServerMessage, { type: T }>) => boolean
): Promise<Extract<ServerMessage, { type: T }>> {
  return new Promise((resolve) => {
    const handler = (data: any) => {
      const msg = JSON.parse(data.toString()) as ServerMessage;
      if (msg.type !== type) return;
      const typed = msg as Extract<ServerMessage, { type: T }>;
      if (predicate && !predicate(typed)) return;
      ws.off('message', handler);
      resolve(typed);
    };
    ws.on('message', handler);
  });
}

// Use a dynamic port to avoid conflicts (high range to avoid common services)
let portCounter = 19700;
function getPort(): number {
  return portCounter++;
}

describe('BridgeServer', () => {
  let server: BridgeServer;
  let port: number;

  beforeEach(() => {
    port = getPort();
    mockCodexInstances = [];
  });

  afterEach(async () => {
    await server?.stop();
  });

  describe('start and stop', () => {
    it('starts in dry-run mode without calling codex.start()', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
        dryRun: true,
      });

      await server.start();
      // Should be able to connect
      const ws = new WebSocket(`ws://localhost:${port}`);
      const msg = await waitForMessage(ws);
      expect(msg.type).toBe('connected');
      ws.close();
    });

    it('stops cleanly', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
        dryRun: true,
      });

      await server.start();
      await server.stop();

      // Connection should fail after stop
      const ws = new WebSocket(`ws://localhost:${port}`);
      await expect(
        new Promise((resolve, reject) => {
          ws.once('open', resolve);
          ws.once('error', reject);
        })
      ).rejects.toBeDefined();
    });
  });

  describe('connection handling', () => {
    it('sends connected message to new clients', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
        dryRun: true,
      });
      await server.start();

      const ws = new WebSocket(`ws://localhost:${port}`);
      const msg = await waitForMessage(ws);
      expect(msg.type).toBe('connected');
      ws.close();
    });

    it('handles multiple client connections', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
        dryRun: true,
      });
      await server.start();

      const ws1 = new WebSocket(`ws://localhost:${port}`);
      const ws2 = new WebSocket(`ws://localhost:${port}`);

      const [msg1, msg2] = await Promise.all([
        waitForMessage(ws1),
        waitForMessage(ws2),
      ]);

      expect(msg1.type).toBe('connected');
      expect(msg2.type).toBe('connected');

      ws1.close();
      ws2.close();
    });
  });

  describe('message handling', () => {
    it('responds to ping with pong broadcast', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
        dryRun: true,
      });
      await server.start();

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForMessage(ws); // consume 'connected'

      const pongPromise = waitForMessage(ws);
      const pingMsg: ClientMessage = { type: 'ping' };
      ws.send(JSON.stringify(pingMsg));

      const pong = await pongPromise;
      expect(pong.type).toBe('pong');
      ws.close();
    });

    it('handles malformed JSON gracefully', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
        dryRun: true,
      });
      await server.start();

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForMessage(ws); // consume 'connected'

      // Send invalid JSON - server should not crash
      ws.send('not valid json {{{');

      // Server should still respond to subsequent messages
      const pongPromise = waitForMessage(ws);
      ws.send(JSON.stringify({ type: 'ping' }));
      const pong = await pongPromise;
      expect(pong.type).toBe('pong');
      ws.close();
    });

    it('rejects annotation when requireProjectRoot is enabled and client is unregistered', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
        dryRun: true,
        requireProjectRoot: true,
      });
      await server.start();

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForMessage(ws); // consume 'connected'

      ws.send(JSON.stringify({ type: 'annotation', payload: makeAnnotation({ id: 'strict-ann' }) }));
      const failed = await waitForMessageType(ws, 'status', (msg) =>
        msg.annotationId === 'strict-ann' && msg.status === 'failed'
      );
      expect(failed.error).toContain('Client projectRoot is required');
      ws.close();
    });

    it('rejects banana_request when requireProjectRoot is enabled and client is unregistered', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
        dryRun: true,
        requireProjectRoot: true,
      });
      await server.start();

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForMessage(ws); // consume 'connected'

      ws.send(JSON.stringify({
        type: 'banana_request',
        payload: {
          id: 'strict-banana',
          timestamp: Date.now(),
          screenshot: 'data:image/png;base64,AAA',
          region: { x: 0, y: 0, width: 100, height: 80 },
          instruction: 'make it nicer',
          status: 'pending',
        },
      }));

      const failed = await waitForMessageType(ws, 'banana_status', (msg) =>
        msg.requestId === 'strict-banana' && msg.status === 'failed'
      );
      expect(failed.error).toContain('Client projectRoot is required');
      ws.close();
    });
  });

  describe('dry-run processing', () => {
    it('processes annotation in dry-run mode and broadcasts status updates', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
        dryRun: true,
      });
      await server.start();

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForMessage(ws); // consume 'connected'

      const annotation = makeAnnotation({ id: 'dry-test-1' });
      const messages: ServerMessage[] = [];

      // Collect all messages
      const donePromise = new Promise<void>((resolve) => {
        ws.on('message', (data) => {
          const msg: ServerMessage = JSON.parse(data.toString());
          messages.push(msg);
          // dry-run ends with status 'applied'
          if (msg.type === 'status' && 'status' in msg && msg.status === 'applied') {
            resolve();
          }
        });
      });

      ws.send(JSON.stringify({ type: 'annotation', payload: annotation }));
      await donePromise;

      // Should have: processing status, progress messages, applied status
      const statusMsgs = messages.filter(m => m.type === 'status') as Extract<ServerMessage, { type: 'status' }>[];
      const progressMsgs = messages.filter(m => m.type === 'progress') as Extract<ServerMessage, { type: 'progress' }>[];

      expect(statusMsgs.length).toBeGreaterThanOrEqual(2); // processing + applied
      expect(statusMsgs[0].status).toBe('processing');
      expect(statusMsgs[statusMsgs.length - 1].status).toBe('applied');
      expect(progressMsgs.length).toBeGreaterThanOrEqual(1);
      // All progress messages should reference the annotation ID
      for (const pm of progressMsgs) {
        expect(pm.annotationId).toBe('dry-test-1');
      }

      ws.close();
    }, 10000);
  });

  describe('queue management', () => {
    it('processes annotations sequentially with concurrency 1', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
        dryRun: true,
      });
      await server.start();

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForMessage(ws); // consume 'connected'

      const ann1 = makeAnnotation({ id: 'queue-1' });
      const ann2 = makeAnnotation({ id: 'queue-2' });

      const appliedIds: string[] = [];
      const donePromise = new Promise<void>((resolve) => {
        ws.on('message', (data) => {
          const msg: ServerMessage = JSON.parse(data.toString());
          if (msg.type === 'status' && 'status' in msg && msg.status === 'applied') {
            appliedIds.push(msg.annotationId);
            if (appliedIds.length === 2) resolve();
          }
        });
      });

      ws.send(JSON.stringify({ type: 'annotation', payload: ann1 }));
      ws.send(JSON.stringify({ type: 'annotation', payload: ann2 }));

      await donePromise;

      // Both should be processed in order
      expect(appliedIds).toEqual(['queue-1', 'queue-2']);

      ws.close();
    }, 15000);
  });

  describe('per-client routing', () => {
    it('sends responses only to the requesting client', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
        dryRun: true,
      });
      await server.start();

      const ws1 = new WebSocket(`ws://localhost:${port}`);
      const ws2 = new WebSocket(`ws://localhost:${port}`);

      await Promise.all([waitForMessage(ws1), waitForMessage(ws2)]); // consume 'connected'

      // ws1 sends an annotation; ws2 should NOT receive status updates
      const ws2Messages: ServerMessage[] = [];
      ws2.on('message', (data) => {
        ws2Messages.push(JSON.parse(data.toString()));
      });

      const ann = makeAnnotation({ id: 'routing-test' });
      const appliedPromise = new Promise<void>((resolve) => {
        ws1.on('message', (data) => {
          const msg: ServerMessage = JSON.parse(data.toString());
          if (msg.type === 'status' && 'status' in msg && msg.status === 'applied') resolve();
        });
      });

      ws1.send(JSON.stringify({ type: 'annotation', payload: ann }));
      await appliedPromise;

      // Wait a bit to ensure ws2 doesn't receive straggling messages
      await new Promise((r) => setTimeout(r, 100));

      // ws2 should have received NO annotation-related messages
      const ws2AnnotationMsgs = ws2Messages.filter(
        (m) => m.type === 'status' || m.type === 'progress'
      );
      expect(ws2AnnotationMsgs.length).toBe(0);

      ws1.close();
      ws2.close();
    }, 10000);

    it('sends pong only to the sender', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
        dryRun: true,
      });
      await server.start();

      const ws1 = new WebSocket(`ws://localhost:${port}`);
      const ws2 = new WebSocket(`ws://localhost:${port}`);

      await Promise.all([waitForMessage(ws1), waitForMessage(ws2)]); // consume 'connected'

      const ws2Messages: ServerMessage[] = [];
      ws2.on('message', (data) => {
        ws2Messages.push(JSON.parse(data.toString()));
      });

      const pong1 = waitForMessage(ws1);
      ws1.send(JSON.stringify({ type: 'ping' }));
      const msg = await pong1;
      expect(msg.type).toBe('pong');

      await new Promise((r) => setTimeout(r, 100));
      expect(ws2Messages.filter((m) => m.type === 'pong').length).toBe(0);

      ws1.close();
      ws2.close();
    });

    it('routes in-flight annotation updates to reconnected client in the same projectRoot', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
        dryRun: true,
      });
      await server.start();

      const ws1 = new WebSocket(`ws://localhost:${port}`);
      await waitForMessage(ws1); // connected
      ws1.send(JSON.stringify({ type: 'register', projectRoot: '/tmp/reconnect-project' }));

      ws1.send(JSON.stringify({ type: 'annotation', payload: makeAnnotation({ id: 'reconnect-ann' }) }));
      await waitForMessageType(ws1, 'status', (msg) =>
        msg.annotationId === 'reconnect-ann' && msg.status === 'processing'
      );

      ws1.close();

      const ws2 = new WebSocket(`ws://localhost:${port}`);
      await waitForMessage(ws2); // connected
      ws2.send(JSON.stringify({ type: 'register', projectRoot: '/tmp/reconnect-project' }));

      const applied = await waitForMessageType(ws2, 'status', (msg) =>
        msg.annotationId === 'reconnect-ann' && msg.status === 'applied'
      );
      expect(applied.status).toBe('applied');

      ws2.close();
    }, 10000);
  });

  describe('restart_codex', () => {
    it('ignores restart in dry-run mode and broadcasts failure', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
        dryRun: true,
      });
      await server.start();

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForMessage(ws); // consume 'connected'

      const restartPromise = waitForMessage(ws);
      ws.send(JSON.stringify({ type: 'restart_codex' }));
      const msg = await restartPromise;

      expect(msg.type).toBe('restart_complete');
      if (msg.type === 'restart_complete') {
        expect(msg.success).toBe(false);
        expect(msg.error).toBe('dry-run mode');
      }

      ws.close();
    });
  });

  describe('mcp mode workflows', () => {
    it('waits for approval_response and then applies annotation', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
      });
      await server.start();

      const codex = mockCodexInstances[0];
      codex.execute.mockImplementationOnce(async (
        _annotation: Annotation,
        _projectRoot: string,
        _onProgress: (message: string) => void,
        onApproval?: (command: string) => Promise<boolean>,
      ) => {
        const approved = await onApproval?.('npm test');
        return approved
          ? { success: true, output: 'approved', durationMs: 10, threadId: 'thread-approval' }
          : { success: false, output: '', error: 'denied', durationMs: 10, threadId: 'thread-approval' };
      });

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForMessage(ws); // connected

      ws.send(JSON.stringify({ type: 'annotation', payload: makeAnnotation({ id: 'approval-ann' }) }));
      const approvalReq = await waitForMessageType(ws, 'approval_request', (msg) => msg.annotationId === 'approval-ann');
      expect(approvalReq.command).toBe('npm test');

      ws.send(JSON.stringify({ type: 'approval_response', annotationId: 'approval-ann', approved: true }));
      const applied = await waitForMessageType(ws, 'status', (msg) =>
        msg.annotationId === 'approval-ann' && msg.status === 'applied'
      );
      expect(applied.status).toBe('applied');
      ws.close();
    });

    it('continues thread with plan_apply and calls codex.reply', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
      });
      await server.start();

      const codex = mockCodexInstances[0];
      codex.execute.mockResolvedValueOnce({
        success: true,
        output: 'initial',
        durationMs: 10,
        threadId: 'thread-plan',
      });
      codex.reply.mockResolvedValueOnce({
        success: true,
        output: 'plan applied',
        durationMs: 12,
        threadId: 'thread-plan',
      });

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForMessage(ws); // connected

      ws.send(JSON.stringify({ type: 'annotation', payload: makeAnnotation({ id: 'plan-ann' }) }));
      await waitForMessageType(ws, 'status', (msg) => msg.annotationId === 'plan-ann' && msg.status === 'applied');

      ws.send(JSON.stringify({ type: 'plan_apply', annotationId: 'plan-ann', approach: '1' }));
      const applied = await waitForMessageType(ws, 'status', (msg) =>
        msg.annotationId === 'plan-ann' && msg.status === 'applied'
      );
      expect(applied.response).toBe('plan applied');
      expect(codex.reply).toHaveBeenCalledWith(
        'thread-plan',
        expect.stringContaining('# Apply Spark Plan Variant 1'),
        expect.any(Function),
      );
      ws.close();
    });

    it('routes banana_apply approval to the same requestId and resumes after approval_response', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
      });
      await server.start();

      const codex = mockCodexInstances[0];
      codex.execute.mockImplementationOnce(async (
        _annotation: Annotation,
        _projectRoot: string,
        _onProgress: (message: string) => void,
        onApproval?: (command: string) => Promise<boolean>,
      ) => {
        const approved = await onApproval?.('npm run build');
        return approved
          ? { success: true, output: 'banana approved', durationMs: 10, threadId: 'banana-thread' }
          : { success: false, output: '', error: 'denied', durationMs: 10, threadId: 'banana-thread' };
      });

      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForMessage(ws); // connected

      const requestId = 'banana-approval-1';
      (server as any).bananaRequests.set(requestId, {
        id: requestId,
        timestamp: Date.now(),
        screenshot: 'data:image/png;base64,AAA',
        region: { x: 0, y: 0, width: 100, height: 80 },
        instruction: 'match target image',
        status: 'suggestions_ready',
      });

      ws.send(JSON.stringify({
        type: 'banana_apply',
        requestId,
        suggestion: {
          id: 'opt-a',
          title: 'Option A',
          description: 'Apply style A',
          image: 'data:image/png;base64,AAA',
        },
      }));

      const approvalReq = await waitForMessageType(ws, 'approval_request', (msg) => msg.annotationId === requestId);
      expect(approvalReq.command).toBe('npm run build');

      ws.send(JSON.stringify({ type: 'approval_response', annotationId: requestId, approved: true }));
      const applied = await waitForMessageType(ws, 'banana_status', (msg) =>
        msg.requestId === requestId && msg.status === 'applied'
      );
      expect(applied.status).toBe('applied');
      expect(codex.execute.mock.calls[0][0].id).toBe(requestId);

      ws.close();
    });
  });

  describe('banana request handling', () => {
    it('returns failed banana_status when api key is missing', async () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      try {
        server = new BridgeServer({
          port,
          codex: { projectRoot: '/tmp' },
          concurrency: 1,
          dryRun: true,
        });
        await server.start();

        const ws = new WebSocket(`ws://localhost:${port}`);
        await waitForMessage(ws); // connected

        ws.send(JSON.stringify({
          type: 'banana_request',
          payload: {
            id: 'banana-no-key',
            timestamp: Date.now(),
            screenshot: 'data:image/png;base64,AAA',
            region: { x: 0, y: 0, width: 100, height: 80 },
            instruction: 'make it nicer',
            status: 'pending',
          },
        }));

        const failed = await waitForMessageType(ws, 'banana_status', (msg) =>
          msg.requestId === 'banana-no-key' && msg.status === 'failed'
        );
        expect(failed.error).toContain('No Gemini API key');
        ws.close();
      } finally {
        if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
        else process.env.GEMINI_API_KEY = originalKey;
      }
    });
  });

  describe('set_model', () => {
    it('forwards model changes to codex', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
        dryRun: true,
      });
      await server.start();

      const codex = mockCodexInstances[0];
      const ws = new WebSocket(`ws://localhost:${port}`);
      await waitForMessage(ws); // connected

      ws.send(JSON.stringify({ type: 'set_model', model: 'gpt-5.3-codex' }));
      await vi.waitFor(() => {
        expect(codex.setModel).toHaveBeenCalledWith('gpt-5.3-codex');
      });
      ws.close();
    });
  });

  describe('client disconnect', () => {
    it('removes client from set on disconnect', async () => {
      server = new BridgeServer({
        port,
        codex: { projectRoot: '/tmp' },
        concurrency: 1,
        dryRun: true,
      });
      await server.start();

      const ws1 = new WebSocket(`ws://localhost:${port}`);
      const ws2 = new WebSocket(`ws://localhost:${port}`);

      await Promise.all([waitForMessage(ws1), waitForMessage(ws2)]);

      // Close ws1
      ws1.close();
      await new Promise((r) => setTimeout(r, 100));

      // ws2 should still receive pong when someone pings
      const pongPromise = waitForMessage(ws2);
      ws2.send(JSON.stringify({ type: 'ping' }));
      const pong = await pongPromise;
      expect(pong.type).toBe('pong');

      ws2.close();
    });
  });
});
