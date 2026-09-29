/**
 * Depth via parallax. The element moves at a different rate to the page.
 *
 * Implemented with a direct style write inside one rAF loop reading the shared
 * scroll engine — never React state, so scrolling causes no re-renders.
 * Falls back to a static element on touch devices and reduced motion.
 */
import { useRef, useEffect } from 'react';
import { scrollState } from '../../utils/scrollEngine';
import { usePrefersReducedMotion, useIsTouch } from '../../hooks';

export default function ParallaxElement({
  children,
  /** Pixels of travel across the full viewport. Negative moves up. */
  distance = 60,
  className = '',
  style,
  as: Tag = 'div',
}) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const touch = useIsTouch();
  const enabled = !reduced && !touch;

  useEffect(() => {
    if (!enabled || !ref.current) return undefined;
    const element = ref.current;
    let raf = null;
    let current = 0;

    const loop = () => {
      const vh = scrollState.viewportHeight || 1;
      // -1 (below viewport) → 0 (centre) → 1 (above viewport)
      const rect = element.getBoundingClientRect();
      const centre = rect.top + rect.height / 2;
      const normalised = (scrollState.viewportHeight / 2 - centre) / (vh / 2 + rect.height / 2);
      const target = Math.max(-1.5, Math.min(1.5, normalised)) * distance;

      current += (target - current) * 0.12;
      element.style.transform = `translate3d(0, ${current.toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      element.style.transform = '';
    };
  }, [enabled, distance]);

  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}
