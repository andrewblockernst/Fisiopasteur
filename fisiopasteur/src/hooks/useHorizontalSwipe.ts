'use client';

import { useEffect, useRef } from 'react';

interface Options {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enabled?: boolean;
  threshold?: number;
}

// Swipe horizontal con detección de dirección dominante para no robar el
// scroll vertical de las vistas (día/semana con celdas de hora).
export function useHorizontalSwipe<T extends HTMLElement>({
  onSwipeLeft,
  onSwipeRight,
  enabled = true,
  threshold = 60,
}: Options) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;
    let locked: 'h' | 'v' | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        tracking = false;
        return;
      }
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      tracking = true;
      locked = null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      const t = e.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      if (!locked) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
        locked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      if (locked !== 'h') return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) < threshold) return;
      if (Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) onSwipeLeft();
      else onSwipeRight();
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', () => { tracking = false; }, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [enabled, onSwipeLeft, onSwipeRight, threshold]);

  return ref;
}
