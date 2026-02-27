import { useState, useEffect, useRef, useCallback } from 'react';

const FAB_SIZE = 52;

export function useFabDrag(position: 'bottom-right' | 'bottom-left', onTap: () => void) {
  const [fabPos, setFabPos] = useState({ x: 0, y: 0 });
  const [fabReady, setFabReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, originX: 0, originY: 0, moved: false });

  useEffect(() => {
    const margin = 16;
    setFabPos({
      x: position === 'bottom-left' ? margin : window.innerWidth - FAB_SIZE - margin,
      y: window.innerHeight - FAB_SIZE - margin,
    });
    setFabReady(true);
  }, [position]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: fabPos.x,
      originY: fabPos.y,
      moved: false,
    };
    setDragging(true);
  }, [fabPos]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
    const margin = 8;
    setFabPos({
      x: Math.max(margin, Math.min(window.innerWidth - FAB_SIZE - margin, dragRef.current.originX + dx)),
      y: Math.max(margin, Math.min(window.innerHeight - FAB_SIZE - margin, dragRef.current.originY + dy)),
    });
  }, [dragging]);

  const handlePointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    const margin = 16;
    setFabPos((prev) => ({
      x: prev.x + FAB_SIZE / 2 < window.innerWidth / 2
        ? margin
        : window.innerWidth - FAB_SIZE - margin,
      y: prev.y,
    }));
    if (!dragRef.current.moved) onTap();
  }, [dragging, onTap]);

  return {
    fabPos, fabReady, dragging,
    handlePointerDown, handlePointerMove, handlePointerUp,
  };
}
