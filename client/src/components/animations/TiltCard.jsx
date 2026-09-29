/**
 * Card with cursor-driven 3D tilt and a matching specular sheen.
 * Kept small (≤8°) so text never distorts and readability wins.
 */
import { useRef, useEffect, useCallback } from 'react';
import { usePrefersReducedMotion, useIsTouch } from '../../hooks';

export default function TiltCard({
  children,
  max = 7,
  className = '',
  sheen = true,
  ...rest
}) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const touch = useIsTouch();
  const enabled = !reduced && !touch;
  const raf = useRef(null);
  const state = useRef({ rx: 0, ry: 0, t: 0.5 });

  const paint = useCallback(() => {
    const element = ref.current;
    if (!element) return;
    const { rx, ry, t } = state.current;
    element.style.transform = `perspective(1100px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(0)`;
    if (sheen) {
      element.style.setProperty('--sheen-x', `${(t * 100).toFixed(1)}%`);
      element.style.setProperty('--sheen-o', Math.max(0, 0.55 - Math.abs(t - 0.5) * 1.1).toFixed(3));
    }
  }, [sheen]);

  const onPointerMove = useCallback(
    (event) => {
      if (!enabled || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width;
      const py = (event.clientY - rect.top) / rect.height;
      state.current.ry = (px - 0.5) * max * 2;
      state.current.rx = -(py - 0.5) * max * 2;
      state.current.t = px;
      if (!raf.current) raf.current = requestAnimationFrame(paint);
    },
    [enabled, max, paint],
  );

  const reset = useCallback(() => {
    state.current = { rx: 0, ry: 0, t: 0.5 };
    if (raf.current) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
    paint();
  }, [paint]);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    [],
  );

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      className={`tilt-card ${className}`}
      style={{ willChange: 'transform' }}
      {...rest}
    >
      {sheen && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
          style={{
            opacity: 'var(--sheen-o, 0)',
            background:
              'radial-gradient(420px circle at var(--sheen-x,50%) -10%, rgba(255,255,255,0.11), transparent 62%)',
          }}
        />
      )}
      {children}
    </div>
  );
}
