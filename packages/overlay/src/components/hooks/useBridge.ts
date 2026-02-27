import { useState, useEffect, useRef } from 'react';
import { BridgeClient } from '../../core/bridge-client';
import type { Annotation, BananaRequest, BananaSuggestion, SparkPlanVariant } from '../../core/types';

export interface BridgeState {
  connected: boolean;
  annotations: Annotation[];
  setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
  pendingApproval: { annotationId: string; command: string } | null;
  setPendingApproval: React.Dispatch<React.SetStateAction<{ annotationId: string; command: string } | null>>;
  progressLines: Record<string, string>;
  restartState: 'idle' | 'restarting' | 'done' | 'failed';
  logsRef: React.MutableRefObject<Record<string, string[]>>;
  clientRef: React.MutableRefObject<BridgeClient | null>;
  // Actions
  sendAnnotation: (a: Annotation, plan?: boolean) => void;
  sendApproval: (annotationId: string, approved: boolean) => void;
  sendRestartCodex: () => void;
  sendSetModel: (model: string) => void;
  sendBananaRequest: (req: BananaRequest, apiKey: string, model?: string, fast?: boolean) => void;
  sendBananaApply: (requestId: string, suggestion: BananaSuggestion) => void;
  sendPlanApply: (annotationId: string, approach: string) => void;
}

export function useBridge(
  bridgeUrl: string,
  projectRoot: string | undefined,
  initialModel: string,
  onBananaSuggestions: (requestId: string, suggestions: BananaSuggestion[]) => void,
  onBananaStatus: (requestId: string, status: BananaRequest['status'], error?: string) => void,
  onBananaProgress: (requestId: string, message: string) => void,
  onPlanVariantsReady: (annotationId: string, variants: SparkPlanVariant[]) => void,
): BridgeState {
  const [connected, setConnected] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [pendingApproval, setPendingApproval] = useState<{ annotationId: string; command: string } | null>(null);
  const [progressLines, setProgressLines] = useState<Record<string, string>>({});
  const [restartState, setRestartState] = useState<'idle' | 'restarting' | 'done' | 'failed'>('idle');
  const logsRef = useRef<Record<string, string[]>>({});
  const clientRef = useRef<BridgeClient | null>(null);

  useEffect(() => {
    const client = new BridgeClient(bridgeUrl, projectRoot);
    clientRef.current = client;

    client.connect({
      onStatus: (id, status, error, response) => {
        setAnnotations((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status, error, response } : a))
        );
        setPendingApproval((prev) =>
          prev?.annotationId === id && (status === 'applied' || status === 'failed') ? null : prev
        );
      },
      onProgress: (id, message) => {
        if (message) {
          if (!logsRef.current[id]) logsRef.current[id] = [];
          const logs = logsRef.current[id];
          if (logs.length === 0 || logs[logs.length - 1] !== message) logs.push(message);
          setProgressLines((prev) => ({ ...prev, [id]: message }));
        }
      },
      onApproval: (id, command) => setPendingApproval({ annotationId: id, command }),
      onConnection: (isConnected) => {
        setConnected(isConnected);
        if (isConnected) client.sendSetModel(initialModel);
      },
      onRestart: (success) => {
        setRestartState(success ? 'done' : 'failed');
        setTimeout(() => setRestartState('idle'), 2500);
      },
      onBananaSuggestions,
      onBananaStatus,
      onBananaProgress,
      onPlanVariantsReady,
    });

    return () => client.disconnect();
  }, [bridgeUrl]);

  return {
    connected, annotations, setAnnotations,
    pendingApproval, setPendingApproval,
    progressLines, restartState, logsRef, clientRef,
    sendAnnotation: (a, plan) => clientRef.current?.sendAnnotation(a, plan),
    sendApproval: (id, approved) => clientRef.current?.sendApprovalResponse(id, approved),
    sendRestartCodex: () => {
      if (restartState === 'restarting') return;
      clientRef.current?.sendRestartCodex();
      setRestartState('restarting');
      setTimeout(() => setRestartState((s) => s === 'restarting' ? 'failed' : s), 15000);
    },
    sendSetModel: (m) => clientRef.current?.sendSetModel(m),
    sendBananaRequest: (req, key, model, fast) => clientRef.current?.sendBananaRequest(req, key, model, fast),
    sendBananaApply: (id, s) => clientRef.current?.sendBananaApply(id, s),
    sendPlanApply: (id, approach) => clientRef.current?.sendPlanApply(id, approach),
  };
}
