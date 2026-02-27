/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BridgeClient } from './bridge-client';
import type { Annotation, ServerMessage } from './types';

// Mock WebSocket for jsdom environment
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: any) => void) | null = null;
  onmessage: ((event: any) => void) | null = null;
  onclose: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Auto-connect after a tick
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.({});
    }, 0);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    // Trigger onclose after a tick
    setTimeout(() => {
      this.onclose?.({});
    }, 0);
  }

  // Test helper: simulate receiving a message from server
  simulateMessage(msg: ServerMessage) {
    this.onmessage?.({ data: JSON.stringify(msg) });
  }

  // Test helper: simulate connection error
  simulateError() {
    this.onerror?.({});
  }

  // Test helper: simulate close
  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({});
  }
}

// Keep track of all created MockWebSocket instances
let wsInstances: MockWebSocket[] = [];
const OriginalWebSocket = globalThis.WebSocket;

beforeEach(() => {
  wsInstances = [];
  // @ts-ignore - Mock WebSocket globally
  globalThis.WebSocket = class extends MockWebSocket {
    constructor(url: string) {
      super(url);
      wsInstances.push(this);
    }
  } as any;
  // Attach static properties
  (globalThis.WebSocket as any).OPEN = MockWebSocket.OPEN;
  (globalThis.WebSocket as any).CLOSED = MockWebSocket.CLOSED;
  (globalThis.WebSocket as any).CONNECTING = MockWebSocket.CONNECTING;
  (globalThis.WebSocket as any).CLOSING = MockWebSocket.CLOSING;
});

afterEach(() => {
  globalThis.WebSocket = OriginalWebSocket;
  vi.restoreAllMocks();
});

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 'test-ann-1',
    timestamp: Date.now(),
    comment: 'Fix this',
    type: 'click',
    status: 'pending',
    element: {
      selector: '#target',
      genericSelector: 'div.target',
      fullPath: 'body > div.target',
      tagName: 'div',
      textContent: 'Content',
      cssClasses: ['target'],
      attributes: {},
      boundingBox: { x: 0, y: 0, width: 100, height: 50 },
      parentSelector: 'body',
      nearbyText: '[Content]',
    },
    ...overrides,
  };
}

describe('BridgeClient', () => {
  describe('constructor', () => {
    it('creates with default URL', () => {
      const client = new BridgeClient();
      expect(client).toBeDefined();
    });

    it('creates with custom URL', () => {
      const client = new BridgeClient('ws://custom:4000');
      expect(client).toBeDefined();
    });
  });

  describe('connect', () => {
    it('establishes WebSocket connection and calls onConnection(true) on open', async () => {
      const client = new BridgeClient('ws://localhost:3700');
      const onConnection = vi.fn();

      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection,
      });

      // Wait for the async open
      await vi.waitFor(() => {
        expect(onConnection).toHaveBeenCalledWith(true);
      });
    });

    it('creates a WebSocket with the correct URL', () => {
      const client = new BridgeClient('ws://myhost:9999');
      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      expect(wsInstances.length).toBe(1);
      expect(wsInstances[0].url).toBe('ws://myhost:9999');
    });

    it('sends register message on open when projectRoot is provided', async () => {
      const client = new BridgeClient('ws://localhost:3700', '/tmp/project');
      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      await vi.waitFor(() => expect(wsInstances.length).toBe(1));
      await vi.waitFor(() => expect(wsInstances[0].sentMessages.length).toBeGreaterThan(0));

      const registerMsg = JSON.parse(wsInstances[0].sentMessages[0]);
      expect(registerMsg).toEqual({ type: 'register', projectRoot: '/tmp/project' });
    });
  });

  describe('message handling', () => {
    it('calls onStatus for status messages', async () => {
      const client = new BridgeClient();
      const onStatus = vi.fn();

      client.connect({
        onStatus,
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      await vi.waitFor(() => expect(wsInstances.length).toBe(1));
      const ws = wsInstances[0];

      ws.simulateMessage({
        type: 'status',
        annotationId: 'ann-1',
        status: 'applied',
      });

      expect(onStatus).toHaveBeenCalledWith('ann-1', 'applied', undefined, undefined);
    });

    it('calls onStatus with error and response fields', async () => {
      const client = new BridgeClient();
      const onStatus = vi.fn();

      client.connect({
        onStatus,
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      await vi.waitFor(() => expect(wsInstances.length).toBe(1));
      const ws = wsInstances[0];

      ws.simulateMessage({
        type: 'status',
        annotationId: 'ann-2',
        status: 'failed',
        error: 'timeout',
        response: 'partial output',
      });

      expect(onStatus).toHaveBeenCalledWith('ann-2', 'failed', 'timeout', 'partial output');
    });

    it('calls onProgress for progress messages', async () => {
      const client = new BridgeClient();
      const onProgress = vi.fn();

      client.connect({
        onStatus: vi.fn(),
        onProgress,
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      await vi.waitFor(() => expect(wsInstances.length).toBe(1));
      const ws = wsInstances[0];

      ws.simulateMessage({
        type: 'progress',
        annotationId: 'ann-1',
        message: 'Processing...',
      });

      expect(onProgress).toHaveBeenCalledWith('ann-1', 'Processing...');
    });

    it('calls onApproval for approval_request messages', async () => {
      const client = new BridgeClient();
      const onApproval = vi.fn();

      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval,
        onConnection: vi.fn(),
      });

      await vi.waitFor(() => expect(wsInstances.length).toBe(1));
      const ws = wsInstances[0];

      ws.simulateMessage({
        type: 'approval_request',
        annotationId: 'ann-1',
        command: 'rm -rf /tmp/test',
      });

      expect(onApproval).toHaveBeenCalledWith('ann-1', 'rm -rf /tmp/test');
    });

    it('calls onRestart for restart_complete messages', async () => {
      const client = new BridgeClient();
      const onRestart = vi.fn();

      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
        onRestart,
      });

      await vi.waitFor(() => expect(wsInstances.length).toBe(1));
      const ws = wsInstances[0];

      ws.simulateMessage({ type: 'restart_complete', success: true });
      expect(onRestart).toHaveBeenCalledWith(true, undefined);

      ws.simulateMessage({ type: 'restart_complete', success: false, error: 'crash' });
      expect(onRestart).toHaveBeenCalledWith(false, 'crash');
    });

    it('calls onPlanVariantsReady for plan_variants_ready messages', async () => {
      const client = new BridgeClient();
      const onPlanVariantsReady = vi.fn();

      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
        onPlanVariantsReady,
      });

      await vi.waitFor(() => expect(wsInstances.length).toBe(1));
      const ws = wsInstances[0];

      ws.simulateMessage({
        type: 'plan_variants_ready',
        annotationId: 'ann-1',
        variants: [{ index: 0, title: 'Conservative', description: 'safe' }],
      });

      expect(onPlanVariantsReady).toHaveBeenCalledWith('ann-1', [
        { index: 0, title: 'Conservative', description: 'safe' },
      ]);
    });

    it('ignores connected messages silently', async () => {
      const client = new BridgeClient();
      const onStatus = vi.fn();

      client.connect({
        onStatus,
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      await vi.waitFor(() => expect(wsInstances.length).toBe(1));
      const ws = wsInstances[0];

      ws.simulateMessage({ type: 'connected' });
      expect(onStatus).not.toHaveBeenCalled();
    });

    it('handles malformed JSON messages gracefully', async () => {
      const client = new BridgeClient();
      const onStatus = vi.fn();

      client.connect({
        onStatus,
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      await vi.waitFor(() => expect(wsInstances.length).toBe(1));
      const ws = wsInstances[0];

      // Manually trigger onmessage with invalid JSON
      ws.onmessage?.({ data: 'not json {{{' });
      expect(onStatus).not.toHaveBeenCalled();
    });
  });

  describe('sendAnnotation', () => {
    it('sends annotation message when connected', async () => {
      const client = new BridgeClient();
      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      await vi.waitFor(() => {
        expect(wsInstances.length).toBe(1);
        expect(wsInstances[0].readyState).toBe(MockWebSocket.OPEN);
      });

      const annotation = makeAnnotation();
      client.sendAnnotation(annotation);

      const ws = wsInstances[0];
      expect(ws.sentMessages.length).toBe(1);
      const parsed = JSON.parse(ws.sentMessages[0]);
      expect(parsed.type).toBe('annotation');
      expect(parsed.payload.id).toBe('test-ann-1');
    });

    it('does not send when WebSocket is not open', () => {
      const client = new BridgeClient();
      // Don't connect - just try to send
      client.sendAnnotation(makeAnnotation());
      // No WebSocket created yet, so no messages sent
      expect(wsInstances.length).toBe(0);
    });
  });

  describe('sendApprovalResponse', () => {
    it('sends approval response', async () => {
      const client = new BridgeClient();
      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      await vi.waitFor(() => {
        expect(wsInstances[0]?.readyState).toBe(MockWebSocket.OPEN);
      });

      client.sendApprovalResponse('ann-1', true);

      const ws = wsInstances[0];
      const parsed = JSON.parse(ws.sentMessages[0]);
      expect(parsed.type).toBe('approval_response');
      expect(parsed.annotationId).toBe('ann-1');
      expect(parsed.approved).toBe(true);
    });

    it('sends denial response', async () => {
      const client = new BridgeClient();
      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      await vi.waitFor(() => {
        expect(wsInstances[0]?.readyState).toBe(MockWebSocket.OPEN);
      });

      client.sendApprovalResponse('ann-2', false);

      const ws = wsInstances[0];
      const parsed = JSON.parse(ws.sentMessages[0]);
      expect(parsed.approved).toBe(false);
    });
  });

  describe('sendRestartCodex', () => {
    it('sends restart_codex message', async () => {
      const client = new BridgeClient();
      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      await vi.waitFor(() => {
        expect(wsInstances[0]?.readyState).toBe(MockWebSocket.OPEN);
      });

      client.sendRestartCodex();

      const ws = wsInstances[0];
      const parsed = JSON.parse(ws.sentMessages[0]);
      expect(parsed.type).toBe('restart_codex');
    });
  });

  describe('additional send methods', () => {
    it('sends set_model message', async () => {
      const client = new BridgeClient();
      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      await vi.waitFor(() => {
        expect(wsInstances[0]?.readyState).toBe(MockWebSocket.OPEN);
      });

      client.sendSetModel('gpt-5.3-codex');
      const parsed = JSON.parse(wsInstances[0].sentMessages[0]);
      expect(parsed).toEqual({ type: 'set_model', model: 'gpt-5.3-codex' });
    });

    it('sends plan_apply message', async () => {
      const client = new BridgeClient();
      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      await vi.waitFor(() => {
        expect(wsInstances[0]?.readyState).toBe(MockWebSocket.OPEN);
      });

      client.sendPlanApply('ann-2', '1');
      const parsed = JSON.parse(wsInstances[0].sentMessages[0]);
      expect(parsed).toEqual({ type: 'plan_apply', annotationId: 'ann-2', approach: '1' });
    });

    it('sends banana_request and banana_apply messages', async () => {
      const client = new BridgeClient();
      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      await vi.waitFor(() => {
        expect(wsInstances[0]?.readyState).toBe(MockWebSocket.OPEN);
      });

      client.sendBananaRequest({
        id: 'banana-1',
        timestamp: Date.now(),
        screenshot: 'data:image/png;base64,AAA',
        region: { x: 0, y: 0, width: 100, height: 50 },
        instruction: 'refine UI',
        status: 'pending',
      }, 'key', 'gemini-test', true);

      client.sendBananaApply('banana-1', {
        id: 's1',
        title: 'Option A',
        description: 'desc',
        image: 'data:image/png;base64,BBB',
      });

      const first = JSON.parse(wsInstances[0].sentMessages[0]);
      const second = JSON.parse(wsInstances[0].sentMessages[1]);
      expect(first.type).toBe('banana_request');
      expect(first.fast).toBe(true);
      expect(second).toEqual({
        type: 'banana_apply',
        requestId: 'banana-1',
        suggestion: {
          id: 's1',
          title: 'Option A',
          description: 'desc',
          image: 'data:image/png;base64,BBB',
        },
      });
    });
  });

  describe('reconnection', () => {
    it('calls onConnection(false) when connection closes', async () => {
      vi.useFakeTimers();
      const client = new BridgeClient();
      const onConnection = vi.fn();

      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection,
      });

      // Advance to trigger the async open
      await vi.advanceTimersByTimeAsync(10);
      expect(onConnection).toHaveBeenCalledWith(true);

      // Simulate close
      wsInstances[0].simulateClose();
      expect(onConnection).toHaveBeenCalledWith(false);

      vi.useRealTimers();
    });

    it('schedules reconnect after close', async () => {
      vi.useFakeTimers();
      const client = new BridgeClient();

      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      await vi.advanceTimersByTimeAsync(10);
      expect(wsInstances.length).toBe(1);

      // Simulate close
      wsInstances[0].simulateClose();

      // Advance past reconnect delay (3000ms)
      await vi.advanceTimersByTimeAsync(3100);

      // Should have created a new WebSocket
      expect(wsInstances.length).toBe(2);

      vi.useRealTimers();
    });

    it('calls onConnection(false) on error', async () => {
      const client = new BridgeClient();
      const onConnection = vi.fn();

      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection,
      });

      await vi.waitFor(() => expect(wsInstances.length).toBe(1));
      wsInstances[0].simulateError();

      expect(onConnection).toHaveBeenCalledWith(false);
    });
  });

  describe('disconnect', () => {
    it('closes WebSocket and clears handlers', async () => {
      const client = new BridgeClient();
      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      await vi.waitFor(() => expect(wsInstances.length).toBe(1));

      client.disconnect();

      const ws = wsInstances[0];
      expect(ws.readyState).toBe(MockWebSocket.CLOSED);
      expect(ws.onopen).toBeNull();
      expect(ws.onmessage).toBeNull();
      expect(ws.onclose).toBeNull();
      expect(ws.onerror).toBeNull();
    });

    it('prevents reconnection after disconnect', async () => {
      vi.useFakeTimers();
      const client = new BridgeClient();

      client.connect({
        onStatus: vi.fn(),
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      await vi.advanceTimersByTimeAsync(10);
      client.disconnect();

      // Advance past reconnect timer
      await vi.advanceTimersByTimeAsync(5000);

      // Should not have reconnected
      expect(wsInstances.length).toBe(1);

      vi.useRealTimers();
    });

    it('does not process messages after disconnect', async () => {
      const client = new BridgeClient();
      const onStatus = vi.fn();

      client.connect({
        onStatus,
        onProgress: vi.fn(),
        onApproval: vi.fn(),
        onConnection: vi.fn(),
      });

      await vi.waitFor(() => expect(wsInstances.length).toBe(1));
      const ws = wsInstances[0];

      // Store reference to onmessage before disconnect clears it
      client.disconnect();

      // onmessage is null after disconnect, so no callbacks
      expect(ws.onmessage).toBeNull();
      expect(onStatus).not.toHaveBeenCalled();
    });
  });
});
