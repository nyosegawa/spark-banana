/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, cleanup, act } from '@testing-library/react';
import { SparkAnnotation } from './SparkAnnotation';

// Mock the CSS import
vi.mock('../styles/overlay.css', () => ({}));

// Track all BridgeClient instances
let bridgeInstances: any[] = [];

// Mock BridgeClient as a proper class
vi.mock('../core/bridge-client', () => {
  class MockBridgeClient {
    url: string;
    projectRoot?: string;
    connectFn = vi.fn();
    disconnectFn = vi.fn();
    sendAnnotationFn = vi.fn();
    sendApprovalResponseFn = vi.fn();
    sendRestartCodexFn = vi.fn();

    constructor(url: string, projectRoot?: string) {
      this.url = url;
      this.projectRoot = projectRoot;
      bridgeInstances.push(this);
    }

    connect(handlers: any) {
      this.connectFn(handlers);
    }

    disconnect() {
      this.disconnectFn();
    }

    sendAnnotation(annotation: any) {
      this.sendAnnotationFn(annotation);
    }

    sendApprovalResponse(annotationId: string, approved: boolean) {
      this.sendApprovalResponseFn(annotationId, approved);
    }

    sendRestartCodex() {
      this.sendRestartCodexFn();
    }
  }

  return { BridgeClient: MockBridgeClient };
});

// Mock captureElement since it needs real DOM measurements
vi.mock('../core/selector-engine', () => ({
  captureElement: vi.fn().mockReturnValue({
    selector: '#mock-element',
    genericSelector: 'div.mock',
    fullPath: 'body > div.mock',
    tagName: 'div',
    textContent: 'Mock content',
    cssClasses: ['mock'],
    attributes: {},
    boundingBox: { x: 0, y: 0, width: 100, height: 50 },
    parentSelector: 'body',
    nearbyText: '[Mock content]',
  }),
}));

describe('SparkAnnotation', () => {
  beforeEach(() => {
    bridgeInstances = [];
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 768, writable: true, configurable: true });
    // Mock localStorage
    const store: Record<string, string> = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] || null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => { store[key] = value; });

    delete (process.env as Record<string, string | undefined>).VITE_SPARK_PROJECT_ROOT;
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SPARK_PROJECT_ROOT;
  });

  afterEach(() => {
    cleanup();
    delete (process.env as Record<string, string | undefined>).VITE_SPARK_PROJECT_ROOT;
    delete (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SPARK_PROJECT_ROOT;
    vi.restoreAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<SparkAnnotation />);
    expect(container).toBeDefined();
  });

  it('renders the FAB button', () => {
    const { container } = render(<SparkAnnotation />);
    const fab = container.querySelector('.sa-fab');
    expect(fab).not.toBeNull();
  });

  it('renders with sa-overlay wrapper', () => {
    const { container } = render(<SparkAnnotation />);
    const overlay = container.querySelector('.sa-overlay');
    expect(overlay).not.toBeNull();
  });

  it('applies dark theme by default', () => {
    const { container } = render(<SparkAnnotation />);
    const overlay = container.querySelector('.sa-overlay');
    expect(overlay?.getAttribute('data-theme')).toBe('dark');
  });

  it('renders with disconnected class initially', () => {
    const { container } = render(<SparkAnnotation />);
    const fab = container.querySelector('.sa-fab');
    expect(fab?.classList.contains('disconnected')).toBe(true);
  });

  it('FAB starts in bottom-right position by default', () => {
    const { container } = render(<SparkAnnotation />);
    const fab = container.querySelector('.sa-fab') as HTMLElement;
    expect(fab).not.toBeNull();
    // Position should be near bottom-right (1024 - 52 - 16 = 956)
    const left = parseInt(fab.style.left);
    expect(left).toBeGreaterThan(900);
  });

  it('FAB position adjusts for bottom-left', () => {
    const { container } = render(<SparkAnnotation position="bottom-left" />);
    const fab = container.querySelector('.sa-fab') as HTMLElement;
    expect(fab).not.toBeNull();
    // Position should be near bottom-left (16)
    const left = parseInt(fab.style.left);
    expect(left).toBeLessThan(50);
  });

  it('creates BridgeClient with custom bridgeUrl', () => {
    render(<SparkAnnotation bridgeUrl="ws://custom:4000" />);
    expect(bridgeInstances.length).toBeGreaterThanOrEqual(1);
    expect(bridgeInstances[0].url).toBe('ws://custom:4000');
  });

  it('uses env project root when projectRoot prop is omitted', () => {
    (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SPARK_PROJECT_ROOT = '/tmp/from-next-env';
    render(<SparkAnnotation />);
    expect(bridgeInstances.length).toBeGreaterThanOrEqual(1);
    expect(bridgeInstances[0].projectRoot).toBe('/tmp/from-next-env');
  });

  it('prefers Vite env project root over Next.js env when both are present', () => {
    (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SPARK_PROJECT_ROOT = '/tmp/from-next-env';
    (process.env as Record<string, string | undefined>).VITE_SPARK_PROJECT_ROOT = '/tmp/from-vite-env';

    render(<SparkAnnotation />);
    expect(bridgeInstances.length).toBeGreaterThanOrEqual(1);
    expect(bridgeInstances[0].projectRoot).toBe('/tmp/from-vite-env');
  });

  it('prefers explicit projectRoot prop over env', () => {
    (process.env as Record<string, string | undefined>).NEXT_PUBLIC_SPARK_PROJECT_ROOT = '/tmp/from-next-env';
    render(<SparkAnnotation projectRoot="/tmp/from-prop" />);
    expect(bridgeInstances.length).toBeGreaterThanOrEqual(1);
    expect(bridgeInstances[0].projectRoot).toBe('/tmp/from-prop');
  });

  it('creates BridgeClient with default bridgeUrl', () => {
    render(<SparkAnnotation />);
    expect(bridgeInstances.length).toBeGreaterThanOrEqual(1);
    expect(bridgeInstances[0].url).toBe('ws://localhost:3700');
  });

  it('calls connect on BridgeClient on mount', () => {
    render(<SparkAnnotation />);
    expect(bridgeInstances.length).toBeGreaterThanOrEqual(1);
    const client = bridgeInstances[0];
    expect(client.connectFn).toHaveBeenCalledWith(
      expect.objectContaining({
        onStatus: expect.any(Function),
        onProgress: expect.any(Function),
        onApproval: expect.any(Function),
        onConnection: expect.any(Function),
        onRestart: expect.any(Function),
      })
    );
  });

  it('calls disconnect on BridgeClient on unmount', () => {
    const { unmount } = render(<SparkAnnotation />);
    const client = bridgeInstances[0];
    unmount();
    expect(client.disconnectFn).toHaveBeenCalled();
  });

  it('does not render panel initially', () => {
    const { container } = render(<SparkAnnotation />);
    const panel = container.querySelector('.sa-panel');
    expect(panel).toBeNull();
  });

  it('does not show hover highlight initially', () => {
    const { container } = render(<SparkAnnotation />);
    const highlight = container.querySelector('.sa-highlight');
    expect(highlight).toBeNull();
  });

  it('does not show approval modal initially', () => {
    const { container } = render(<SparkAnnotation />);
    const modal = container.querySelector('.sa-modal-backdrop');
    expect(modal).toBeNull();
  });

  describe('SSR safety', () => {
    it('renders in jsdom environment with typeof window check', () => {
      const { container } = render(<SparkAnnotation />);
      expect(container.querySelector('.sa-overlay')).not.toBeNull();
    });
  });
});
