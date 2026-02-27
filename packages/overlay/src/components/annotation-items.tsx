import React, { useState } from 'react';
import { t, type Locale } from '../core/i18n';
import type { Annotation, SparkPlanVariant } from '../core/types';
import type { BananaJob } from './hooks/useBanana';
import { formatProgressLine, renderLogLine } from './log-utils';

interface BananaJobItemProps {
  job: BananaJob;
  locale: Locale;
  onOpenModal: (id: string) => void;
}

export function BananaJobItem({ job, locale, onOpenModal }: BananaJobItemProps) {
  const [expanded, setExpanded] = useState(false);
  const isAnalyzing = job.status === 'analyzing';
  const isApplying = job.status === 'applying';
  const isDone = job.status === 'applied' || job.status === 'failed';

  const borderColor =
    (isAnalyzing || isApplying)
      ? 'var(--sa-blue)'
      : isDone
        ? (job.status === 'applied' ? 'var(--sa-green)' : 'var(--sa-red)')
        : 'var(--sa-yellow)';

  const selectedSuggestion = job.selectedId
    ? job.suggestions.find((s) => s.id === job.selectedId)
    : null;

  const showSelectedThumb = (isApplying || isDone) && selectedSuggestion;

  return (
    <div className="sa-annotation-item" style={{ borderLeftColor: borderColor }}>
      <div className="sa-annotation-comment">{job.instruction}</div>

      {isAnalyzing && (
        <div className="sa-annotation-progress">
          <span className="sa-spinner" />
          <span className="sa-progress-text">{job.progress || t('bananaAnalyzing', locale)}</span>
        </div>
      )}

      {job.suggestions.length > 0 && job.status === 'suggestions_ready' && (
        <button className="sa-banana-view-btn" onClick={() => onOpenModal(job.id)}>
          {job.suggestions.length} designs ready — View
        </button>
      )}

      {showSelectedThumb && (
        <div className="sa-banana-selected-thumb">
          <img src={selectedSuggestion.image} alt={selectedSuggestion.title} />
        </div>
      )}

      {isApplying && (
        <div className="sa-annotation-progress">
          <span className="sa-spinner" />
          <span className="sa-progress-text">{formatProgressLine(job.progress) || t('processing', locale)}</span>
        </div>
      )}

      {isDone && (
        <div
          className={`sa-annotation-status${job.logs.length > 0 ? ' clickable' : ''}`}
          onClick={job.logs.length > 0 ? () => setExpanded((v) => !v) : undefined}
        >
          {job.status === 'applied' ? t('applied', locale) : `${t('failed', locale)}: ${job.progress}`}
          {job.logs.length > 0 && <span className="sa-log-toggle">{expanded ? '▼' : '▶'} log</span>}
        </div>
      )}

      {expanded && job.logs.length > 0 && (
        <div className="sa-annotation-log">
          {job.logs.map((line, i) => renderLogLine(line, i))}
        </div>
      )}
    </div>
  );
}

interface AnnotationItemProps {
  annotation: Annotation;
  locale: Locale;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  logs?: string[];
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  progressLine?: string;
  followUpText: string;
  setFollowUpText: (text: string) => void;
  onFollowUpSubmit: () => void;
  composingRef: React.MutableRefObject<boolean>;
  variants?: SparkPlanVariant[];
  activeVariant: number;
  onSwitchVariant: (idx: number) => void;
  onApplyVariant: (idx: number) => void;
  onCancelPlan: () => void;
}

export function AnnotationItem({
  annotation: a,
  locale,
  expandedId,
  setExpandedId,
  logs,
  history,
  progressLine,
  followUpText,
  setFollowUpText,
  onFollowUpSubmit,
  composingRef,
  variants,
  activeVariant,
  onSwitchVariant,
  onApplyVariant,
  onCancelPlan,
}: AnnotationItemProps) {
  const isProcessing = a.status === 'processing';
  const isDone = a.status === 'applied' || a.status === 'failed';
  const isExpanded = expandedId === a.id;
  const hasLogs = Boolean(logs && logs.length > 0);
  const hasHistory = Boolean(history && history.length > 0);

  const statusLabel = (s: Annotation['status'], error?: string) => {
    switch (s) {
      case 'pending':
        return t('pending', locale);
      case 'processing':
        return t('processing', locale);
      case 'applied':
        return t('applied', locale);
      case 'failed':
        return `${t('failed', locale)}: ${error || 'unknown'}`;
    }
  };

  return (
    <div
      className={`sa-annotation-item ${a.status}${isDone && hasLogs ? ' clickable' : ''}`}
      onClick={isDone && hasLogs ? () => setExpandedId(isExpanded ? null : a.id) : undefined}
    >
      <div className="sa-annotation-selector">{a.element.selector}</div>

      {hasHistory && (
        <div className="sa-conversation-history">
          {history!.map((h, i) => (
            <div key={i} className={`sa-history-line sa-history-${h.role}`}>
              <span className="sa-history-role">{h.role === 'user' ? '>' : '='}</span>
              <span className="sa-history-content">{h.content.length > 120 ? `${h.content.slice(0, 120)}...` : h.content}</span>
            </div>
          ))}
        </div>
      )}

      <div className="sa-annotation-comment">{a.comment}</div>

      {isProcessing ? (
        <div className="sa-annotation-progress">
          <span className="sa-spinner" />
          <span className="sa-progress-text">{formatProgressLine(progressLine) || 'Processing...'}</span>
        </div>
      ) : (
        <div className="sa-annotation-status">
          {statusLabel(a.status, a.error)}
          {isDone && hasLogs && <span className="sa-log-toggle">{isExpanded ? '▼' : '▶'} log</span>}
        </div>
      )}

      {isDone && a.response && !isExpanded && <div className="sa-annotation-response">{a.response}</div>}

      {isExpanded && hasLogs && (
        <div className="sa-annotation-log">
          {logs!.map((line, i) => renderLogLine(line, i))}
          {a.response && (
            <>
              <div className="sa-log-divider" />
              <div className="sa-log-line sa-log-result">{a.response}</div>
            </>
          )}
        </div>
      )}

      {a.status === 'applied' && variants && variants.length > 0 && (
        <div className="sa-plan-variant-picker" onClick={(e) => e.stopPropagation()}>
          <div className="sa-plan-variant-tabs">
            {variants.map((v) => (
              <button
                key={v.index}
                className={`sa-plan-variant-tab${activeVariant === v.index ? ' active' : ''}`}
                onClick={() => onSwitchVariant(v.index)}
              >
                <span className="sa-plan-variant-num">{v.index + 1}</span>
                <span className="sa-plan-variant-title">{v.title}</span>
              </button>
            ))}
          </div>

          {variants[activeVariant]?.description && (
            <div className="sa-plan-variant-desc">{variants[activeVariant].description}</div>
          )}

          <div className="sa-plan-variant-actions">
            <button className="sa-modal-btn deny" onClick={onCancelPlan}>{t('planCancel', locale)}</button>
            <button className="sa-modal-btn approve" onClick={() => onApplyVariant(activeVariant)}>
              {t('planApply', locale)} #{activeVariant + 1}
            </button>
          </div>
        </div>
      )}

      {a.status === 'applied' && !variants && (
        <div className="sa-followup-input" onClick={(e) => e.stopPropagation()}>
          <input
            className="sa-followup-field"
            type="text"
            placeholder={t('followUpPlaceholder', locale)}
            value={followUpText}
            onChange={(e) => setFollowUpText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !composingRef.current) {
                e.preventDefault();
                onFollowUpSubmit();
              }
            }}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={() => {
              composingRef.current = false;
            }}
          />
        </div>
      )}
    </div>
  );
}
