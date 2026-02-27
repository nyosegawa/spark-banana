import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Annotation, SparkAnnotationConfig, SparkPlanVariant } from '../core/types';
import { t, LOCALES, LOCALE_LABELS, type Locale } from '../core/i18n';
import {
  SparkIcon, CrossIcon, SunIcon, MoonIcon, ShieldIcon,
  RefreshIcon, CheckIcon, AlertTriangleIcon, RocketIcon,
  TurtleIcon, BananaIcon, CloseIcon, LightningIcon, ClipboardIcon,
} from './Icons';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useFabDrag } from './hooks/useFabDrag';
import { useBridge } from './hooks/useBridge';
import { useBanana } from './hooks/useBanana';
import { useSparkSelection } from './hooks/useSparkSelection';
import { bananaTemplates, getTemplateName } from '../core/banana-templates';
import { BananaJobItem, AnnotationItem } from './annotation-items';
import '../styles/overlay.css';

let idCounter = 0;
function genId(): string {
  return `sa-${Date.now()}-${++idCounter}`;
}

function readImportMetaEnv(): Record<string, unknown> {
  try {
    // Use runtime evaluation so CJS/SSR bundles do not break on import.meta.
    const value = new Function('try { return import.meta.env; } catch { return undefined; }')();
    return (value && typeof value === 'object') ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function readEnvVar(key: string): string | undefined {
  const metaEnv = readImportMetaEnv();
  const metaValue = metaEnv[key];
  if (typeof metaValue === 'string' && metaValue.trim()) return metaValue.trim();

  try {
    const env = (process as unknown as { env?: Record<string, string | undefined> }).env;
    const processValue = env?.[key];
    if (processValue?.trim()) return processValue.trim();
  } catch {
    // ignore
  }

  try {
    const globalValue = (window as unknown as Record<string, unknown>)[key];
    if (typeof globalValue === 'string' && globalValue.trim()) return globalValue.trim();
  } catch {
    // ignore
  }

  return undefined;
}

function detectProjectRoot(): string | undefined {
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="spark-project-root"]')?.getAttribute('content');
    if (meta) return meta;
  }

  const keys = [
    'VITE_SPARK_PROJECT_ROOT',
    'NEXT_PUBLIC_SPARK_PROJECT_ROOT',
    'REACT_APP_SPARK_PROJECT_ROOT',
    'SPARK_PROJECT_ROOT',
    '__SPARK_PROJECT_ROOT__',
  ];
  for (const key of keys) {
    const value = readEnvVar(key);
    if (value) return value;
  }

  return undefined;
}

export function SparkAnnotation({
  bridgeUrl = 'ws://localhost:3700',
  projectRoot,
  position = 'bottom-right',
}: SparkAnnotationConfig = {}) {
  const resolvedProjectRoot = projectRoot || detectProjectRoot();

  const [active, setActive] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState<'spark' | 'banana'>('spark');
  const [comment, setComment] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [localeMenu, setLocaleMenu] = useState(false);
  const [followUpTexts, setFollowUpTexts] = useState<Record<string, string>>({});
  const [bananaModalJobId, setBananaModalJobId] = useState<string | null>(null);
  const bananaModalDismissedRef = useRef(new Set<string>());
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [planVariants, setPlanVariants] = useState<Record<string, SparkPlanVariant[]>>({});
  const [activePlanVariant, setActivePlanVariant] = useState<Record<string, number>>({});

  const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('sa-theme', 'dark');
  const [currentModel, setCurrentModel] = useLocalStorage<string>('sa-model', 'gpt-5.3-codex-spark');
  const [locale, setLocale] = useLocalStorage<Locale>('sa-locale', 'en');
  const [planMode, setPlanMode] = useLocalStorage<'fast' | 'plan'>('sa-plan-mode', 'fast');

  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const historyRef = useRef<Record<string, Array<{ role: 'user' | 'assistant'; content: string }>>>({});

  const handlePlanVariantsReady = useCallback((annotationId: string, variants: SparkPlanVariant[]) => {
    setPlanVariants((prev) => ({ ...prev, [annotationId]: variants }));
    setActivePlanVariant((prev) => ({ ...prev, [annotationId]: 0 }));
  }, []);

  const banana = useBanana(
    (req, key, model, fast) => bridge.sendBananaRequest(req, key, model, fast),
    (id, s) => bridge.sendBananaApply(id, s),
    setPanelOpen,
  );

  const bridge = useBridge(
    bridgeUrl,
    resolvedProjectRoot,
    currentModel,
    banana.onSuggestions,
    banana.onStatus,
    banana.onProgress,
    handlePlanVariantsReady,
  );

  const sparkSelection = useSparkSelection({
    active,
    mode,
    setPanelOpen,
    focusInput: () => inputRef.current?.focus(),
    onResetComment: () => setComment(''),
  });

  const fab = useFabDrag(position, () => {
    setActive((prev) => {
      if (!prev) {
        setPanelOpen(true);
      } else {
        sparkSelection.setHoveredElement(null);
        sparkSelection.clearSelection();
      }
      return !prev;
    });
  });

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const toggleModel = () => {
    const next = currentModel === 'gpt-5.3-codex-spark' ? 'gpt-5.3-codex' : 'gpt-5.3-codex-spark';
    setCurrentModel(next);
    bridge.sendSetModel(next);
  };

  const toggleMode = () => {
    setMode((prev) => {
      if (prev === 'banana') banana.resetInput();
      return prev === 'spark' ? 'banana' : 'spark';
    });
  };

  const handleLocaleChange = (nextLocale: Locale) => {
    setLocale(nextLocale);
    setLocaleMenu(false);
  };

  const handleSubmit = () => {
    if (!sparkSelection.selectedElement || !comment.trim()) return;

    const isPlan = planMode === 'plan';
    const annotation: Annotation = {
      id: genId(),
      timestamp: Date.now(),
      element: sparkSelection.selectedElement,
      comment: comment.trim(),
      type: 'click',
      status: 'pending',
    };

    bridge.setAnnotations((prev) => [annotation, ...prev]);
    bridge.sendAnnotation(annotation, isPlan);
    sparkSelection.clearSelection();
    setComment('');
    setActive(false);
    sparkSelection.setHoveredElement(null);
  };

  const handleApproval = (approved: boolean) => {
    if (!bridge.pendingApproval) return;
    bridge.sendApproval(bridge.pendingApproval.annotationId, approved);
    bridge.setPendingApproval(null);
  };

  const handleFollowUpSubmit = (annotation: Annotation) => {
    const text = (followUpTexts[annotation.id] || '').trim();
    if (!text) return;

    const history = historyRef.current[annotation.id] ??= [];
    history.push({ role: 'user', content: annotation.comment });
    if (annotation.response) history.push({ role: 'assistant', content: annotation.response });

    const updated: Annotation = {
      ...annotation,
      comment: text,
      status: 'pending',
      error: undefined,
      response: undefined,
    };

    bridge.setAnnotations((prev) => prev.map((a) => (a.id === annotation.id ? updated : a)));
    bridge.sendAnnotation(updated);
    setFollowUpTexts((prev) => {
      const next = { ...prev };
      delete next[annotation.id];
      return next;
    });
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (bridge.pendingApproval) return;

    if (previewImage) {
      setPreviewImage(null);
      return;
    }

    if (templateModalOpen) {
      setTemplateModalOpen(false);
      return;
    }

    if (bananaModalJobId) {
      bananaModalDismissedRef.current.add(bananaModalJobId);
      setBananaModalJobId(null);
      return;
    }

    if (mode === 'banana' && (banana.screenshot || banana.rect)) {
      banana.resetInput();
      return;
    }

    if (sparkSelection.sparkRect) {
      sparkSelection.clearSelection();
      return;
    }

    if (sparkSelection.selectedElement) {
      sparkSelection.clearSelection();
      return;
    }

    if (active) {
      setActive(false);
      sparkSelection.setHoveredElement(null);
      return;
    }

    if (panelOpen) {
      setPanelOpen(false);
    }
  }, [
    active,
    banana.rect,
    banana.resetInput,
    banana.screenshot,
    bananaModalJobId,
    bridge.pendingApproval,
    mode,
    panelOpen,
    previewImage,
    sparkSelection,
    templateModalOpen,
  ]);

  useEffect(() => {
    if (!active || mode !== 'banana') return;

    const down = (e: MouseEvent) => banana.handleMouseDown(e, true);
    document.addEventListener('mousedown', down, true);
    document.addEventListener('mousemove', banana.handleMouseMove, true);
    document.addEventListener('mouseup', banana.handleMouseUp, true);
    document.body.style.cursor = 'crosshair';

    return () => {
      document.removeEventListener('mousedown', down, true);
      document.removeEventListener('mousemove', banana.handleMouseMove, true);
      document.removeEventListener('mouseup', banana.handleMouseUp, true);
    };
  }, [active, mode, banana.handleMouseDown, banana.handleMouseMove, banana.handleMouseUp]);

  useEffect(() => {
    if (active || panelOpen) document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [active, panelOpen, handleKeyDown]);

  useEffect(() => {
    const readyJob = banana.jobs.find((j) =>
      j.status === 'suggestions_ready' &&
      j.suggestions.length > 0 &&
      !bananaModalDismissedRef.current.has(j.id)
    );

    if (readyJob && bananaModalJobId !== readyJob.id) {
      setBananaModalJobId(readyJob.id);
    }
  }, [banana.jobs, bananaModalJobId]);

  const bananaModalJob = bananaModalJobId
    ? banana.jobs.find((j) => j.id === bananaModalJobId && j.status === 'suggestions_ready')
    : null;

  const hoverRect = sparkSelection.hoveredElement && !sparkSelection.selectedElement
    ? sparkSelection.hoveredElement.getBoundingClientRect()
    : null;

  const isAnyProcessing = bridge.annotations.some((a) => a.status === 'processing');
  const winW = typeof window !== 'undefined' ? window.innerWidth : 0;
  const winH = typeof window !== 'undefined' ? window.innerHeight : 0;

  const panelStyle: React.CSSProperties =
    fab.fabPos.x + 26 < winW / 2
      ? { bottom: winH - fab.fabPos.y + 12, left: fab.fabPos.x }
      : { bottom: winH - fab.fabPos.y + 12, right: winW - fab.fabPos.x - 52 };

  if (!fab.fabReady) return null;

  return (
    <div className="sa-overlay" data-theme={theme}>
      {hoverRect && (
        <div
          className="sa-highlight"
          style={{
            top: hoverRect.top + window.scrollY,
            left: hoverRect.left,
            width: hoverRect.width,
            height: hoverRect.height,
          }}
        >
          <span className="sa-highlight-label">
            {sparkSelection.hoveredElement!.tagName.toLowerCase()}
            {sparkSelection.hoveredElement!.classList[0]
              ? `.${sparkSelection.hoveredElement!.classList[0]}`
              : ''}
          </span>
        </div>
      )}

      {sparkSelection.highlightRect && (
        <div
          className="sa-highlight selected"
          style={{
            top: sparkSelection.highlightRect.top + window.scrollY,
            left: sparkSelection.highlightRect.left,
            width: sparkSelection.highlightRect.width,
            height: sparkSelection.highlightRect.height,
          }}
        />
      )}

      {mode === 'banana' && banana.rect && (banana.drawing || banana.screenshot) && (
        <div
          className={`sa-banana-rect${!banana.drawing ? ' finalized' : ''}`}
          style={{ left: banana.rect.x, top: banana.rect.y, width: banana.rect.width, height: banana.rect.height }}
        />
      )}

      {mode === 'spark' && sparkSelection.sparkRect && (sparkSelection.sparkDrawing || sparkSelection.selectedElement?.tagName === 'region') && (
        <div
          className={`sa-banana-rect${!sparkSelection.sparkDrawing ? ' finalized' : ''}`}
          style={{
            left: sparkSelection.sparkRect.x,
            top: sparkSelection.sparkRect.y,
            width: sparkSelection.sparkRect.width,
            height: sparkSelection.sparkRect.height,
          }}
        />
      )}

      {panelOpen && (
        <div className="sa-panel" style={panelStyle}>
          <div className="sa-panel-header">
            <div className="sa-panel-title">
              <div className={`sa-panel-status ${bridge.connected ? 'connected' : 'disconnected'}`} />
              {mode === 'banana' ? 'banana' : 'spark'}
            </div>
            <div className="sa-panel-actions">
              <button
                className={`sa-header-btn sa-tooltip-wrap sa-restart-btn ${bridge.restartState}`}
                onClick={bridge.sendRestartCodex}
                disabled={!bridge.connected || bridge.restartState === 'restarting'}
                data-tooltip={t('restartCodex', locale)}
              >
                {bridge.restartState === 'done'
                  ? <CheckIcon />
                  : bridge.restartState === 'failed'
                    ? <AlertTriangleIcon />
                    : <RefreshIcon />}
              </button>
              <button
                className="sa-header-btn sa-tooltip-wrap"
                onClick={toggleMode}
                data-tooltip={mode === 'spark' ? t('bananaMode', locale) : t('sparkMode', locale)}
              >
                {mode === 'spark' ? <BananaIcon /> : <SparkIcon />}
              </button>
              <button
                className={`sa-header-btn sa-tooltip-wrap${planMode === 'plan' ? ' plan-active' : ''}`}
                onClick={() => setPlanMode(planMode === 'fast' ? 'plan' : 'fast')}
                data-tooltip={planMode === 'fast' ? t('fastMode', locale) : t('planMode', locale)}
              >
                {planMode === 'fast' ? <LightningIcon /> : <ClipboardIcon />}
              </button>
              {mode === 'spark' && (
                <button className="sa-header-btn sa-tooltip-wrap" onClick={toggleModel} data-tooltip={currentModel}>
                  {currentModel === 'gpt-5.3-codex-spark' ? <RocketIcon /> : <TurtleIcon />}
                </button>
              )}
              {mode === 'banana' && (
                <button className="sa-header-btn sa-tooltip-wrap" onClick={banana.cycleModel} data-tooltip={banana.model}>
                  {banana.model === 'gemini-3.1-flash-image-preview' ? <RocketIcon /> : <TurtleIcon />}
                </button>
              )}
              <button
                className="sa-header-btn sa-tooltip-wrap"
                onClick={toggleTheme}
                data-tooltip={theme === 'dark' ? t('lightMode', locale) : t('darkMode', locale)}
              >
                {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
              </button>
              <button className="sa-header-btn sa-locale-btn" onClick={() => setLocaleMenu((v) => !v)}><span>Aa</span></button>
              <button className="sa-header-btn" onClick={() => setPanelOpen(false)}><CloseIcon /></button>
            </div>
          </div>

          {!bridge.connected && (
            <div className="sa-disconnected-banner">
              <div className="sa-disconnected-title">{t('bridgeDisconnected', locale)}</div>
              <div className="sa-disconnected-hint">{t('bridgeHint', locale)}</div>
              <code className="sa-disconnected-cmd">npx spark-bridge</code>
              <div className="sa-disconnected-status">
                <span className="sa-spinner" />
                <span>{t('bridgeConnecting', locale)}</span>
              </div>
            </div>
          )}

          {sparkSelection.selectedElement && bridge.connected && (
            <div className="sa-input-area">
              <div className="sa-input-target">{sparkSelection.selectedElement.selector}</div>
              <div className="sa-input-row">
                <input
                  ref={inputRef}
                  className="sa-input"
                  type="text"
                  placeholder={t('inputPlaceholder', locale)}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      handleSubmit();
                    }
                  }}
                />
                <button className="sa-send-btn" onClick={handleSubmit} disabled={!comment.trim() || !bridge.connected}>
                  {t('fix', locale)}
                </button>
              </div>
            </div>
          )}

          {localeMenu && (
            <div className="sa-locale-grid">
              {LOCALES.map((l) => (
                <button
                  key={l}
                  className={`sa-locale-option${l === locale ? ' active' : ''}`}
                  onClick={() => handleLocaleChange(l)}
                >
                  {LOCALE_LABELS[l]}
                </button>
              ))}
            </div>
          )}

          {mode === 'banana' && bridge.connected && (
            <>
              <div className="sa-banana-apikey">
                <label>{t('bananaApiKey', locale)}</label>
                {banana.apiKey ? (
                  <div className="sa-banana-apikey-row">
                    <input type="password" value="••••••••••••" disabled />
                    <button onClick={banana.clearApiKey}>Edit</button>
                  </div>
                ) : (
                  <div className="sa-banana-apikey-row">
                    <input
                      type="password"
                      placeholder="AIza..."
                      value={banana.apiKeyInput}
                      onChange={(e) => banana.setApiKeyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          banana.saveApiKey();
                        }
                      }}
                    />
                    <button onClick={banana.saveApiKey} disabled={!banana.apiKeyInput.trim()}>
                      {t('bananaApiKeySave', locale)}
                    </button>
                  </div>
                )}
                {banana.apiKeySaved && (
                  <div style={{ fontSize: '10px', color: 'var(--sa-green)', marginTop: 2 }}>Saved!</div>
                )}
              </div>

              {banana.screenshot && (
                <div className="sa-banana-preview"><img src={banana.screenshot} alt="captured region" /></div>
              )}

              {banana.screenshot && (
                <div className="sa-input-area">
                  <div className="sa-input-row">
                    <button className="sa-template-btn" onClick={() => setTemplateModalOpen(true)} title="Design templates">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>
                    </button>
                    <input
                      className="sa-input"
                      type="text"
                      placeholder={t('bananaPlaceholder', locale)}
                      value={banana.instruction}
                      onChange={(e) => banana.setInstruction(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          banana.send(planMode === 'fast');
                        }
                      }}
                    />
                    <button
                      className="sa-send-btn"
                      onClick={() => banana.send(planMode === 'fast')}
                      disabled={!banana.instruction.trim() || !banana.apiKey.trim()}
                    >
                      {t('fix', locale)}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {bridge.connected && (
            <div className="sa-list">
              {mode === 'spark' && bridge.annotations.length === 0 && !sparkSelection.selectedElement && !localeMenu && (
                <div className="sa-empty">{t('emptyLine1', locale)}<br />{t('emptyLine2', locale)}</div>
              )}
              {mode === 'banana' && !banana.screenshot && banana.jobs.length === 0 && (
                <div className="sa-empty">{t('bananaEmpty1', locale)}<br />{t('bananaEmpty2', locale)}</div>
              )}
              {mode === 'banana' && banana.captureError && (
                <div className="sa-error-banner">{banana.captureError}</div>
              )}

              {mode === 'banana' && banana.jobs.map((job) => (
                <BananaJobItem
                  key={job.id}
                  job={job}
                  locale={locale}
                  onOpenModal={(id) => {
                    bananaModalDismissedRef.current.delete(id);
                    setBananaModalJobId(id);
                  }}
                />
              ))}

              {bridge.annotations.map((a) => (
                <AnnotationItem
                  key={a.id}
                  annotation={a}
                  locale={locale}
                  expandedId={expandedId}
                  setExpandedId={setExpandedId}
                  logs={bridge.logsRef.current[a.id]}
                  history={historyRef.current[a.id]}
                  progressLine={bridge.progressLines[a.id]}
                  followUpText={followUpTexts[a.id] || ''}
                  setFollowUpText={(text) => setFollowUpTexts((prev) => ({ ...prev, [a.id]: text }))}
                  onFollowUpSubmit={() => handleFollowUpSubmit(a)}
                  composingRef={composingRef}
                  variants={planVariants[a.id]}
                  activeVariant={activePlanVariant[a.id] ?? 0}
                  onSwitchVariant={(idx) => {
                    setActivePlanVariant((prev) => ({ ...prev, [a.id]: idx }));
                    window.dispatchEvent(new CustomEvent('spark-plan-variant', { detail: idx }));
                    (window as any).__sparkPlanVariant = idx;
                  }}
                  onApplyVariant={(idx) => {
                    bridge.sendPlanApply(a.id, String(idx));
                    setPlanVariants((prev) => {
                      const next = { ...prev };
                      delete next[a.id];
                      return next;
                    });
                  }}
                  onCancelPlan={() => {
                    bridge.sendPlanApply(a.id, 'cancel');
                    setPlanVariants((prev) => {
                      const next = { ...prev };
                      delete next[a.id];
                      return next;
                    });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {templateModalOpen && (
        <div className="sa-modal-backdrop" onClick={() => setTemplateModalOpen(false)}>
          <div className="sa-modal template-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header">
              <span className="sa-modal-header-text">Design Theme</span>
              <button className="sa-modal-close" onClick={() => setTemplateModalOpen(false)}><CloseIcon /></button>
            </div>
            <div className="sa-template-grid">
              {bananaTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  className="sa-template-card"
                  onClick={() => {
                    banana.setInstruction(tpl.prompt);
                    setTemplateModalOpen(false);
                  }}
                >
                  <span className="sa-template-emoji">{tpl.emoji}</span>
                  <span className="sa-template-name">{getTemplateName(tpl, locale)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {bananaModalJob && (
        <div className="sa-modal-backdrop" onClick={() => { bananaModalDismissedRef.current.add(bananaModalJob.id); setBananaModalJobId(null); }}>
          <div className="sa-modal banana-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header"><BananaIcon /><span className="sa-modal-header-text">{t('bananaChoose', locale)}</span></div>
            <div className="sa-modal-body">
              <div className="sa-modal-desc">{bananaModalJob.instruction}</div>
              <div className="sa-banana-modal-grid">
                {bananaModalJob.suggestions.map((s) => (
                  <button
                    key={s.id}
                    className={`sa-banana-modal-card${bananaModalJob.selectedId === s.id ? ' selected' : ''}`}
                    onClick={() => banana.updateJob(bananaModalJob.id, { selectedId: bananaModalJob.selectedId === s.id ? null : s.id })}
                  >
                    <div className="sa-banana-modal-card-img-wrap">
                      <img src={s.image} alt={s.title} />
                      <button
                        className="sa-banana-zoom-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImage(s.image);
                        }}
                        title="Expand"
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 1H2a1 1 0 0 0-1 1v4M10 1h4a1 1 0 0 1 1 1v4M6 15H2a1 1 0 0 1-1-1v-4M10 15h4a1 1 0 0 0 1-1v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>
                    <div className="sa-banana-modal-card-title">{s.title}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="sa-modal-footer">
              <button className="sa-modal-btn deny" onClick={() => { bananaModalDismissedRef.current.add(bananaModalJob.id); setBananaModalJobId(null); }}>
                {t('deny', locale)}
              </button>
              <button
                className="sa-modal-btn approve"
                disabled={!bananaModalJob.selectedId}
                onClick={() => {
                  banana.apply(bananaModalJob.id);
                  setBananaModalJobId(null);
                }}
              >
                {t('bananaApply', locale)}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div className="sa-modal-backdrop sa-preview-backdrop" onClick={() => setPreviewImage(null)}>
          <img className="sa-preview-image" src={previewImage} alt="preview" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {bridge.pendingApproval && (
        <div className="sa-modal-backdrop" onClick={() => handleApproval(false)}>
          <div className="sa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sa-modal-header"><ShieldIcon /><span className="sa-modal-header-text">{t('approvalTitle', locale)}</span></div>
            <div className="sa-modal-body">
              <div className="sa-modal-desc">{t('approvalDesc', locale)}</div>
              <div className="sa-modal-command"><code>{bridge.pendingApproval.command}</code></div>
            </div>
            <div className="sa-modal-footer">
              <button className="sa-modal-btn deny" onClick={() => handleApproval(false)}>{t('deny', locale)}</button>
              <button className="sa-modal-btn approve" onClick={() => handleApproval(true)}>{t('allow', locale)}</button>
            </div>
          </div>
        </div>
      )}

      <button
        className={[
          'sa-fab',
          bridge.connected ? 'connected' : 'disconnected',
          active ? 'active-mode' : '',
          fab.dragging ? 'dragging' : '',
          isAnyProcessing ? 'processing' : '',
        ].filter(Boolean).join(' ')}
        style={{ left: fab.fabPos.x, top: fab.fabPos.y }}
        onPointerDown={fab.handlePointerDown}
        onPointerMove={fab.handlePointerMove}
        onPointerUp={fab.handlePointerUp}
        title={active ? t('exitMode', locale) : t('enterMode', locale)}
      >
        {active && !isAnyProcessing ? <CrossIcon /> : (mode === 'banana' ? <BananaIcon fab /> : <SparkIcon />)}
      </button>
    </div>
  );
}
