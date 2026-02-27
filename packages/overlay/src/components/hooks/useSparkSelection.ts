import { useCallback, useEffect, useRef, useState } from 'react';
import { captureElement, captureElementsInRegion } from '../../core/selector-engine';
import type { ElementCapture } from '../../core/types';

export interface SparkRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseSparkSelectionParams {
  active: boolean;
  mode: 'spark' | 'banana';
  setPanelOpen: (open: boolean) => void;
  focusInput: () => void;
  onResetComment: () => void;
}

export function useSparkSelection({
  active,
  mode,
  setPanelOpen,
  focusInput,
  onResetComment,
}: UseSparkSelectionParams) {
  const [selectedElement, setSelectedElement] = useState<ElementCapture | null>(null);
  const [hoveredElement, setHoveredElement] = useState<Element | null>(null);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [sparkDrawing, setSparkDrawing] = useState(false);
  const [sparkRect, setSparkRect] = useState<SparkRect | null>(null);
  const sparkDrawRef = useRef({ startX: 0, startY: 0 });

  const clearSelection = useCallback(() => {
    setSelectedElement(null);
    setHighlightRect(null);
    setSparkRect(null);
  }, []);

  const handleSparkMouseDown = useCallback((e: MouseEvent) => {
    const target = e.target as Element;
    if (target.closest('.sa-overlay')) return;
    e.preventDefault();
    e.stopPropagation();
    sparkDrawRef.current = { startX: e.clientX, startY: e.clientY };
    setSparkDrawing(true);
  }, []);

  const handleSparkMouseMove = useCallback((e: MouseEvent) => {
    if (sparkDrawing) {
      const { startX, startY } = sparkDrawRef.current;
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);

      if (dx > 10 || dy > 10) {
        setSparkRect({
          x: Math.min(startX, e.clientX),
          y: Math.min(startY, e.clientY),
          width: Math.abs(e.clientX - startX),
          height: Math.abs(e.clientY - startY),
        });
        setHoveredElement(null);
      }
      return;
    }

    const target = e.target as Element;
    if (target.closest('.sa-overlay')) {
      setHoveredElement(null);
      return;
    }
    setHoveredElement(target);
  }, [sparkDrawing]);

  const handleSparkMouseUp = useCallback((e: MouseEvent) => {
    if (!sparkDrawing) return;
    setSparkDrawing(false);

    const { startX, startY } = sparkDrawRef.current;
    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);

    if (dx < 20 && dy < 20) {
      setSparkRect(null);
      const target = document.elementFromPoint(startX, startY);
      if (!target || target.closest('.sa-overlay')) return;

      const capture = captureElement(target);
      setSelectedElement(capture);
      setPanelOpen(true);
      onResetComment();

      const rect = target.getBoundingClientRect();
      setHighlightRect(new DOMRect(rect.x, rect.y, rect.width, rect.height));
      setTimeout(() => focusInput(), 100);
      return;
    }

    const regionRect = {
      x: Math.min(startX, e.clientX),
      y: Math.min(startY, e.clientY),
      width: dx,
      height: dy,
    };

    setSparkRect(regionRect);
    const regionElements = captureElementsInRegion(regionRect);
    const elemLines = regionElements.split('\n').filter(Boolean);

    const capture: ElementCapture = {
      selector: `[${elemLines.length} elements in region]`,
      genericSelector: 'body',
      fullPath: 'html > body',
      tagName: 'region',
      textContent: elemLines.slice(0, 5).map((l) => l.replace(/^- /, '')).join(', '),
      cssClasses: [],
      attributes: {},
      boundingBox: {
        x: regionRect.x,
        y: regionRect.y + window.scrollY,
        width: regionRect.width,
        height: regionRect.height,
      },
      parentSelector: 'html',
      nearbyText: regionElements,
    };

    setSelectedElement(capture);
    setHighlightRect(null);
    setPanelOpen(true);
    onResetComment();
    setTimeout(() => focusInput(), 100);
  }, [focusInput, onResetComment, setPanelOpen, sparkDrawing]);

  useEffect(() => {
    if (active && mode === 'spark') {
      document.addEventListener('mousedown', handleSparkMouseDown, true);
      document.addEventListener('mousemove', handleSparkMouseMove, true);
      document.addEventListener('mouseup', handleSparkMouseUp, true);
      document.body.style.cursor = 'crosshair';
    } else if (!active) {
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousedown', handleSparkMouseDown, true);
      document.removeEventListener('mousemove', handleSparkMouseMove, true);
      document.removeEventListener('mouseup', handleSparkMouseUp, true);
      if (mode === 'spark') document.body.style.cursor = '';
    };
  }, [active, mode, handleSparkMouseDown, handleSparkMouseMove, handleSparkMouseUp]);

  return {
    selectedElement,
    setSelectedElement,
    hoveredElement,
    setHoveredElement,
    highlightRect,
    setHighlightRect,
    sparkDrawing,
    sparkRect,
    setSparkRect,
    clearSelection,
  };
}
