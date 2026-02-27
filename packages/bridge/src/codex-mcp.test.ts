import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Annotation } from './types';

// Shared mock state
let mockClientInstance: any = null;
let mockTransportInstance: any = null;

// Mock the MCP SDK with proper class constructors
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => {
  class MockClient {
    fallbackNotificationHandler: any = null;
    fallbackRequestHandler: any = null;

    connect = vi.fn().mockResolvedValue(undefined);
    close = vi.fn().mockResolvedValue(undefined);
    listTools = vi.fn().mockResolvedValue({ tools: [{ name: 'codex' }] });
    callTool = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Applied fix successfully' }],
      isError: false,
    });

    constructor(..._args: any[]) {
      mockClientInstance = this;
    }
  }
  return { Client: MockClient };
});

vi.mock('@modelcontextprotocol/sdk/client/stdio.js', () => {
  class MockStdioClientTransport {
    _process = { stderr: null };
    close = vi.fn().mockResolvedValue(undefined);

    constructor(..._args: any[]) {
      mockTransportInstance = this;
    }
  }
  return { StdioClientTransport: MockStdioClientTransport };
});

import { CodexMcp } from './codex-mcp';

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 'test-1',
    timestamp: Date.now(),
    comment: 'Fix this button',
    type: 'click',
    status: 'pending',
    element: {
      selector: '#btn',
      genericSelector: 'button.primary',
      fullPath: 'body > button.primary',
      tagName: 'button',
      textContent: 'Click me',
      cssClasses: ['primary'],
      attributes: {},
      boundingBox: { x: 10, y: 20, width: 100, height: 40 },
      parentSelector: 'body',
      nearbyText: '[Click me]',
    },
    ...overrides,
  };
}

describe('CodexMcp', () => {
  let codexMcp: CodexMcp;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClientInstance = null;
    mockTransportInstance = null;
    codexMcp = new CodexMcp({ projectRoot: '/tmp/test-project' });
  });

  afterEach(async () => {
    await codexMcp.stop().catch(() => {});
  });

  describe('constructor', () => {
    it('sets default model when not provided', () => {
      const mcp = new CodexMcp({ projectRoot: '/tmp' });
      expect(mcp).toBeDefined();
    });

    it('uses provided model', () => {
      const mcp = new CodexMcp({ projectRoot: '/tmp', model: 'custom-model' });
      expect(mcp).toBeDefined();
    });

    it('sets default timeout when not provided', () => {
      const mcp = new CodexMcp({ projectRoot: '/tmp' });
      expect(mcp).toBeDefined();
    });
  });

  describe('start', () => {
    it('creates transport and client and connects', async () => {
      await codexMcp.start();

      expect(mockClientInstance).not.toBeNull();
      expect(mockTransportInstance).not.toBeNull();
      expect(mockClientInstance.connect).toHaveBeenCalled();
      expect(mockClientInstance.listTools).toHaveBeenCalled();
    });

    it('sets ready state after successful start', async () => {
      await codexMcp.start();

      // After start, execute should work (not return "not connected" error)
      mockClientInstance.callTool.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'ok' }],
        isError: false,
      });

      const result = await codexMcp.execute(makeAnnotation());
      expect(result.success).toBe(true);
    });

    it('sets up notification handler', async () => {
      await codexMcp.start();
      expect(mockClientInstance.fallbackNotificationHandler).toBeDefined();
      expect(typeof mockClientInstance.fallbackNotificationHandler).toBe('function');
    });

    it('sets up request handler', async () => {
      await codexMcp.start();
      expect(mockClientInstance.fallbackRequestHandler).toBeDefined();
      expect(typeof mockClientInstance.fallbackRequestHandler).toBe('function');
    });
  });

  describe('execute', () => {
    it('returns error if not started', async () => {
      const result = await codexMcp.execute(makeAnnotation());
      expect(result.success).toBe(false);
      expect(result.error).toContain('not connected');
    });

    it('calls codex tool with correct arguments after start', async () => {
      await codexMcp.start();

      mockClientInstance.callTool.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Fixed the button' }],
        isError: false,
      });

      const result = await codexMcp.execute(makeAnnotation());

      expect(mockClientInstance.callTool).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'codex',
          arguments: expect.objectContaining({
            cwd: '/tmp/test-project',
            sandbox: 'workspace-write',
            'approval-policy': 'on-request',
          }),
        }),
        undefined,
        expect.objectContaining({
          timeout: 600000,
        })
      );

      expect(result.success).toBe(true);
      expect(result.output).toBe('Fixed the button');
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('returns error when codex returns isError', async () => {
      await codexMcp.start();

      mockClientInstance.callTool.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Something went wrong' }],
        isError: true,
      });

      const result = await codexMcp.execute(makeAnnotation());
      expect(result.success).toBe(false);
      expect(result.error).toContain('Something went wrong');
    });

    it('handles callTool exceptions', async () => {
      await codexMcp.start();

      mockClientInstance.callTool.mockRejectedValueOnce(new Error('Connection lost'));

      const result = await codexMcp.execute(makeAnnotation());
      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection lost');
    });

    it('calls progress callback during execution', async () => {
      await codexMcp.start();

      mockClientInstance.callTool.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'done' }],
        isError: false,
      });

      const onProgress = vi.fn();
      await codexMcp.execute(makeAnnotation(), undefined, onProgress);

      // Should have been called at least once (the initial message)
      expect(onProgress).toHaveBeenCalledWith('Codex に送信中...');
    });

    it('concatenates multiple text content items', async () => {
      await codexMcp.start();

      mockClientInstance.callTool.mockResolvedValueOnce({
        content: [
          { type: 'text', text: 'Line 1' },
          { type: 'image', data: 'ignored' },
          { type: 'text', text: 'Line 2' },
        ],
        isError: false,
      });

      const result = await codexMcp.execute(makeAnnotation());
      expect(result.success).toBe(true);
      expect(result.output).toBe('Line 1\nLine 2');
    });

    it('handles empty content array', async () => {
      await codexMcp.start();

      mockClientInstance.callTool.mockResolvedValueOnce({
        content: [],
        isError: false,
      });

      const result = await codexMcp.execute(makeAnnotation());
      expect(result.success).toBe(true);
      expect(result.output).toBe('');
    });

    it('measures duration', async () => {
      await codexMcp.start();

      mockClientInstance.callTool.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'ok' }],
        isError: false,
      });

      const result = await codexMcp.execute(makeAnnotation());
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.durationMs).toBe('number');
    });

    it('includes prompt from buildPrompt in callTool arguments', async () => {
      await codexMcp.start();

      mockClientInstance.callTool.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'ok' }],
        isError: false,
      });

      await codexMcp.execute(makeAnnotation({ comment: 'Unique test comment XYZ' }));

      const callArgs = mockClientInstance.callTool.mock.calls[0][0];
      expect(callArgs.arguments.prompt).toContain('Unique test comment XYZ');
    });

    it('bridges approval notification to request handler using callback result', async () => {
      await codexMcp.start();

      const onApproval = vi.fn().mockResolvedValue(false);
      mockClientInstance.callTool.mockImplementationOnce(async () => {
        await mockClientInstance.fallbackNotificationHandler({
          method: 'codex/event',
          params: {
            msg: { type: 'exec_approval_request', command: ['echo', 'hello'] },
          },
        });

        const approval = await mockClientInstance.fallbackRequestHandler({ method: 'exec_approval' });
        expect(approval).toEqual({ approved: false });

        return {
          content: [{ type: 'text', text: 'denied' }],
          isError: true,
        };
      });

      const result = await codexMcp.execute(makeAnnotation(), undefined, undefined, onApproval);

      expect(onApproval).toHaveBeenCalledWith('echo hello');
      expect(result.success).toBe(false);
      expect(result.error).toContain('denied');
    });
  });

  describe('resolveApproval', () => {
    it('does not throw when there is no pending approval', () => {
      expect(() => codexMcp.resolveApproval(true)).not.toThrow();
      expect(() => codexMcp.resolveApproval(false)).not.toThrow();
    });

    it('resolves pending approval when callback is not provided', async () => {
      await codexMcp.start();

      mockClientInstance.callTool.mockImplementationOnce(async () => {
        await mockClientInstance.fallbackNotificationHandler({
          method: 'codex/event',
          params: {
            msg: { type: 'exec_approval_request', command: ['npm', 'test'] },
          },
        });

        const approvalPromise = mockClientInstance.fallbackRequestHandler({ method: 'exec_approval' });
        codexMcp.resolveApproval(true);
        const approval = await approvalPromise;
        expect(approval).toEqual({ approved: true });

        return {
          content: [{ type: 'text', text: 'ok' }],
          isError: false,
        };
      });

      const result = await codexMcp.execute(makeAnnotation());
      expect(result.success).toBe(true);
    });
  });

  describe('stop', () => {
    it('cleans up client and transport', async () => {
      await codexMcp.start();

      await codexMcp.stop();

      expect(mockClientInstance.close).toHaveBeenCalled();
      expect(mockTransportInstance.close).toHaveBeenCalled();
    });

    it('sets ready to false so execute returns error', async () => {
      await codexMcp.start();
      await codexMcp.stop();

      const result = await codexMcp.execute(makeAnnotation());
      expect(result.success).toBe(false);
      expect(result.error).toContain('not connected');
    });

    it('handles stop when not started', async () => {
      await expect(codexMcp.stop()).resolves.toBeUndefined();
    });
  });

  describe('restart', () => {
    it('stops and starts again', async () => {
      await codexMcp.start();

      const firstClient = mockClientInstance;
      const firstTransport = mockTransportInstance;

      await codexMcp.restart();

      // close should have been called on the first instance (stop)
      expect(firstClient.close).toHaveBeenCalled();
      expect(firstTransport.close).toHaveBeenCalled();

      // A new client should have been created and connected (start)
      expect(mockClientInstance).not.toBe(firstClient);
      expect(mockClientInstance.connect).toHaveBeenCalled();
      expect(mockClientInstance.listTools).toHaveBeenCalled();
    });
  });
});
