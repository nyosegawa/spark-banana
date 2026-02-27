/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useBridge } from './useBridge';

let bridgeInstances: any[] = [];

vi.mock('../../core/bridge-client', () => {
  class MockBridgeClient {
    url: string;
    projectRoot?: string;
    handlers: any;

    constructor(url: string, projectRoot?: string) {
      this.url = url;
      this.projectRoot = projectRoot;
      bridgeInstances.push(this);
    }

    connect = vi.fn((handlers: any) => {
      this.handlers = handlers;
    });

    disconnect = vi.fn();
    sendAnnotation = vi.fn();
    sendApprovalResponse = vi.fn();
    sendRestartCodex = vi.fn();
    sendSetModel = vi.fn();
    sendBananaRequest = vi.fn();
    sendBananaApply = vi.fn();
    sendPlanApply = vi.fn();
  }

  return { BridgeClient: MockBridgeClient };
});

describe('useBridge', () => {
  beforeEach(() => {
    bridgeInstances = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function renderUseBridge() {
    return renderHook(() => useBridge(
      'ws://localhost:3700',
      '/tmp/project',
      'gpt-5.3-codex',
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
    ));
  }

  it('sends initial model when connection is established', () => {
    const { result } = renderUseBridge();
    const client = bridgeInstances[0];

    act(() => {
      client.handlers.onConnection(true);
    });

    expect(result.current.connected).toBe(true);
    expect(client.sendSetModel).toHaveBeenCalledWith('gpt-5.3-codex');
  });

  it('deduplicates identical progress lines per annotation', () => {
    const { result } = renderUseBridge();
    const client = bridgeInstances[0];

    act(() => {
      client.handlers.onProgress('ann-1', '[status] step1');
      client.handlers.onProgress('ann-1', '[status] step1');
      client.handlers.onProgress('ann-1', '[status] step2');
    });

    expect(result.current.progressLines['ann-1']).toBe('[status] step2');
    expect(result.current.logsRef.current['ann-1']).toEqual(['[status] step1', '[status] step2']);
  });

  it('creates a recovered annotation when progress arrives after reconnect', () => {
    const { result } = renderUseBridge();
    const client = bridgeInstances[0];

    act(() => {
      client.handlers.onProgress('lost-ann', '[status] resumed');
    });

    expect(result.current.annotations.some((a) => a.id === 'lost-ann')).toBe(true);
  });

  it('creates a recovered annotation when status arrives for unknown id', () => {
    const { result } = renderUseBridge();
    const client = bridgeInstances[0];

    act(() => {
      client.handlers.onStatus('lost-ann-2', 'applied', undefined, 'done');
    });

    const ann = result.current.annotations.find((a) => a.id === 'lost-ann-2');
    expect(ann).toBeDefined();
    expect(ann?.status).toBe('applied');
    expect(ann?.response).toBe('done');
  });

  it('moves restart state from restarting to failed on timeout', () => {
    const { result } = renderUseBridge();
    const client = bridgeInstances[0];

    act(() => {
      result.current.sendRestartCodex();
    });
    expect(client.sendRestartCodex).toHaveBeenCalledTimes(1);
    expect(result.current.restartState).toBe('restarting');

    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(result.current.restartState).toBe('failed');
  });

  it('cleans up client on unmount', () => {
    const { unmount } = renderUseBridge();
    const client = bridgeInstances[0];

    unmount();
    expect(client.disconnect).toHaveBeenCalled();
  });

  it('does not create BridgeClient when projectRoot is missing', () => {
    renderHook(() => useBridge(
      'ws://localhost:3700',
      undefined,
      'gpt-5.3-codex',
      vi.fn(),
      vi.fn(),
      vi.fn(),
      vi.fn(),
    ));

    expect(bridgeInstances.length).toBe(0);
  });
});
