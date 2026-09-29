/**
 * Section wrapper that registers itself with the shared scroll engine and
 * reveals its children as it enters the viewport.
 *
 * Registration is what lets the 3D layer know "we are now in the eligibility
 * chapter of the story" and morph the scene accordingly.
 */
import { useEffect, useRef } from 'react';
import { registerSection, sectionFocus } from '../../utils/scrollEngine';
import { usePrefersReducedMotion } from '../../hooks';
import { motion } from 'framer-motion';

export default function ScrollSection({
  id,
  children,
  className = '',
  /** Applied to the inner content wrapper. */
  innerClassName = '',
  tone = 'default',
  as: Tag = 'section',
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!id || !ref.current) return undefined;
    return registerSection(id, ref.current);
  }, [id]);

  const tones = {
    default: '',
    raised: 'bg-ink-900/40',
    deep: 'bg-ink-950/70',
  };

  return (
    <Tag
      ref={ref}
      id={id}
      data-section={id}
      className={`section ${tones[tone] || ''} ${className}`}
    >
      <div className={`shell ${innerClassName}`}>{children}</div>
    </Tag>
  );
}

/** Wraps children in a subtle depth highlight that tracks the section's focus. */
export function FocusLift({ children, className = '' }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);

  useEffect(() => {
    if (reduced || !ref.current) return undefined;
    const element = ref.current;
    let raf = null;

    const loop = () => {
      const id = element.closest('[data-section]')?.id;
      if (id) {
        const focus = sectionFocus(id);
        element.style.setProperty('--focus', focus.toFixed(3));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ ['--focus']: 0 }}
    >
      {children}
    </motion.div>
  );
}
