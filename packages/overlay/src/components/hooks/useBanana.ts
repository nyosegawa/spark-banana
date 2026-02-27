import { useState, useRef, useCallback } from 'react';
import { captureRegion } from '../../core/screen-capture';
import { captureElementsInRegion } from '../../core/selector-engine';
import type { BananaRequest, BananaSuggestion } from '../../core/types';

export interface BananaJob {
  id: string;
  instruction: string;
  status: BananaRequest['status'];
  progress: string;
  logs: string[];
  suggestions: BananaSuggestion[];
  selectedId: string | null;
  fast?: boolean;
}

export function useBanana(
  sendBananaRequest: (req: BananaRequest, apiKey: string, model: string, fast?: boolean) => void,
  sendBananaApply: (requestId: string, suggestion: BananaSuggestion) => void,
  setPanelOpen: (open: boolean) => void,
) {
  // Input phase
  const [drawing, setDrawing] = useState(false);
  const [rect, setRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  const drawRef = useRef({ startX: 0, startY: 0 });

  // API key
  const [apiKey, setApiKey] = useState(() => {
    try { return localStorage.getItem('sa-banana-apikey') || ''; } catch { return ''; }
  });
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);

  // Model
  const BANANA_MODELS = ['gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview', 'gemini-2.5-flash-image'] as const;
  const [model, setModel] = useState(() => {
    try { return localStorage.getItem('sa-banana-model') || BANANA_MODELS[0]; } catch { return BANANA_MODELS[0]; }
  });

  // Region elements captured during rectangle draw
  const regionElementsRef = useRef<string>('');

  // Jobs
  const [jobs, setJobs] = useState<BananaJob[]>([]);

  const updateJob = useCallback((id: string, patch: Partial<BananaJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const resetInput = useCallback(() => {
    setRect(null);
    setScreenshot(null);
    setInstruction('');
  }, []);

  const saveApiKey = useCallback(() => {
    const key = apiKeyInput.trim();
    if (!key) return;
    setApiKey(key);
    setApiKeyInput('');
    setApiKeySaved(true);
    try { localStorage.setItem('sa-banana-apikey', key); } catch { /* */ }
    setTimeout(() => setApiKeySaved(false), 2000);
  }, [apiKeyInput]);

  const clearApiKey = useCallback(() => {
    setApiKey('');
    setApiKeySaved(false);
  }, []);

  const cycleModel = useCallback(() => {
    setModel((prev) => {
      const idx = BANANA_MODELS.indexOf(prev as typeof BANANA_MODELS[number]);
      const next = BANANA_MODELS[(idx + 1) % BANANA_MODELS.length];
      try { localStorage.setItem('sa-banana-model', next); } catch { /* */ }
      return next;
    });
  }, []);

  const send = useCallback((fast?: boolean) => {
    console.log(`[spark-banana] banana.send() called — screenshot=${!!screenshot}, instruction="${instruction.slice(0, 30)}", rect=${!!rect}, apiKey=${apiKey ? 'yes' : 'no'}, fast=${fast ?? false}`);
    if (!screenshot || !instruction.trim() || !rect || !apiKey.trim()) {
      console.warn(`[spark-banana] banana.send() aborted: missing ${!screenshot ? 'screenshot' : !instruction.trim() ? 'instruction' : !rect ? 'rect' : 'apiKey'}`);
      return;
    }

    const reqId = `banana-${Date.now()}`;
    const request: BananaRequest = {
      id: reqId,
      timestamp: Date.now(),
      screenshot,
      region: rect,
      instruction: instruction.trim(),
      regionElements: regionElementsRef.current || undefined,
      status: 'pending',
    };

    setJobs((prev) => [{
      id: reqId,
      instruction: instruction.trim(),
      status: 'analyzing',
      progress: '',
      logs: [],
      suggestions: [],
      selectedId: null,
      fast: fast ?? false,
    }, ...prev]);

    resetInput();
    console.log(`[spark-banana] Calling sendBananaRequest(${reqId}, fast=${fast ?? false})...`);
    sendBananaRequest(request, apiKey, model, fast);
  }, [screenshot, instruction, rect, apiKey, model, resetInput, sendBananaRequest]);

  const apply = useCallback((jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job?.selectedId) return;
    const suggestion = job.suggestions.find((s) => s.id === job.selectedId);
    if (!suggestion) return;

    updateJob(jobId, { status: 'applying', progress: '' });
    sendBananaApply(jobId, suggestion);
  }, [jobs, updateJob, sendBananaApply]);

  // Rectangle drawing handlers
  const handleMouseDown = useCallback((e: MouseEvent, active: boolean) => {
    if (!active) return;
    const target = e.target as Element;
    if (target.closest('.sa-overlay')) return;
    e.preventDefault();
    e.stopPropagation();
    drawRef.current = { startX: e.clientX, startY: e.clientY };
    setDrawing(true);
    setRect({ x: e.clientX, y: e.clientY, width: 0, height: 0 });
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!drawing) return;
    const { startX, startY } = drawRef.current;
    setRect({
      x: Math.min(startX, e.clientX),
      y: Math.min(startY, e.clientY),
      width: Math.abs(e.clientX - startX),
      height: Math.abs(e.clientY - startY),
    });
  }, [drawing]);

  const handleMouseUp = useCallback(async (e: MouseEvent) => {
    if (!drawing) return;
    setDrawing(false);

    const { startX, startY } = drawRef.current;
    const x = Math.min(startX, e.clientX);
    const y = Math.min(startY, e.clientY);
    const width = Math.abs(e.clientX - startX);
    const height = Math.abs(e.clientY - startY);

    if (width < 20 || height < 20) { setRect(null); return; }

    const r = { x, y, width, height };
    setRect(r);
    try {
      const shot = await captureRegion(r);
      setScreenshot(shot);
      // Capture DOM elements in the region for Codex context
      regionElementsRef.current = captureElementsInRegion(r);
      setPanelOpen(true);
    } catch (err) {
      console.error('[spark-banana] Screenshot capture failed:', err);
      setRect(null);
    }
  }, [drawing, setPanelOpen]);

  // Bridge callbacks
  const onSuggestions = useCallback((requestId: string, suggestions: BananaSuggestion[]) => {
    setJobs((prev) => prev.map((j) =>
      j.id === requestId ? { ...j, suggestions, status: 'suggestions_ready' as const } : j
    ));
  }, []);

  const onStatus = useCallback((requestId: string, status: BananaRequest['status'], error?: string) => {
    setJobs((prev) => prev.map((j) =>
      j.id === requestId ? {
        ...j,
        status,
        progress: error ? `Error: ${error}` : status === 'applied' ? 'Applied!' : j.progress,
      } : j
    ));
  }, []);

  const onProgress = useCallback((requestId: string, message: string) => {
    setJobs((prev) => prev.map((j) => {
      if (j.id !== requestId) return j;
      const logs = [...j.logs];
      if (message && (logs.length === 0 || logs[logs.length - 1] !== message)) {
        logs.push(message);
      }
      return { ...j, progress: message, logs };
    }));
  }, []);

  return {
    // Input phase
    drawing, rect, screenshot, instruction, setInstruction, resetInput,
    // API key
    apiKey, apiKeyInput, setApiKeyInput, apiKeySaved, saveApiKey, clearApiKey,
    // Model
    model, cycleModel,
    // Jobs
    jobs, updateJob, send, apply,
    // Drawing handlers
    handleMouseDown, handleMouseMove, handleMouseUp,
    // Bridge callbacks
    onSuggestions, onStatus, onProgress,
  };
}
