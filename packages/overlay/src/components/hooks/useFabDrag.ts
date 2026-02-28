import { useState, useEffect, useRef, useCallback } from 'react';

const FAB_SIZE = 52;
const DRAG_MARGIN = 8;
const INITIAL_MARGIN = 16;

function clampPosition(x: number, y: number, width: number, height: number) {
  const maxX = Math.max(0, width - FAB_SIZE);
  const maxY = Math.max(0, height - FAB_SIZE);
  const minX = Math.min(DRAG_MARGIN, maxX);
  const minY = Math.min(DRAG_MARGIN, maxY);

  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
  };
}

export function useFabDrag(position: 'bottom-right' | 'bottom-left', onTap: () => void) {
  const [fabPos, setFabPos] = useState({ x: 0, y: 0 });
  const [fabReady, setFabReady] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, originX: 0, originY: 0, moved: false });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setFabPos({
      x: position === 'bottom-left' ? INITIAL_MARGIN : window.innerWidth - FAB_SIZE - INITIAL_MARGIN,
      y: window.innerHeight - FAB_SIZE - INITIAL_MARGIN,
    });
    setFabReady(true);
  }, [position]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setFabPos((prev) => clampPosition(prev.x, prev.y, window.innerWidth, window.innerHeight));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    setFabPos(clampPosition(
      dragRef.current.originX + dx,
      dragRef.current.originY + dy,
      window.innerWidth,
      window.innerHeight,
    ));
  }, [dragging]);

  const handlePointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    if (!dragRef.current.moved) onTap();
  }, [dragging, onTap]);

  return {
    fabPos, fabReady, dragging,
    handlePointerDown, handlePointerMove, handlePointerUp,
  };
}
