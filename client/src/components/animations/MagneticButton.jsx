/**
 * Button that leans towards the cursor.
 * Desktop pointer only — touch and reduced-motion users get a plain button.
 */
import { useRef, useEffect } from 'react';
import { scrollState } from '../../utils/scrollEngine';
import { usePrefersReducedMotion, useIsTouch } from '../../hooks';

export default function MagneticButton({ children, strength = 6, className = '', ...rest }) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const touch = useIsTouch();
  const enabled = !reduced && !touch;

  useEffect(() => {
    if (!enabled || !ref.current) return undefined;
    const element = ref.current;
    let raf = null;
    let x = 0;
    let y = 0;
    let inside = false;

    const loop = () => {
      if (inside) {
        const tx = scrollState.pointer.x * strength;
        const ty = scrollState.pointer.y * strength * 0.6;
        x += (tx - x) * 0.14;
        y += (ty - y) * 0.14;
      } else {
        x *= 0.86;
        y *= 0.86;
      }
      element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    const onEnter = () => {
      inside = true;
    };
    const onLeave = () => {
      inside = false;
    };

    element.addEventListener('pointerenter', onEnter);
    element.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(loop);

    return () => {
      element.removeEventListener('pointerenter', onEnter);
      element.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
      element.style.transform = '';
    };
  }, [enabled, strength]);

  return (
    <button ref={ref} className={className} {...rest}>
      {children}
    </button>
  );
}
