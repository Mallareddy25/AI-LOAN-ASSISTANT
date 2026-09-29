/**
 * Reveals children as they enter the viewport.
 *
 * IMPORTANT: this is a *supporting* effect, not the story. The scroll-driven
 * storytelling lives in the 3D layer and in `ParallaxElement`. Reveal is kept
 * subtle (small rise + fade) so content never depends on it — and it is
 * disabled entirely under reduced motion.
 */
import { motion, useReducedMotion } from 'framer-motion';

export default function ScrollReveal({
  children,
  delay = 0,
  y = 18,
  once = true,
  className = '',
  as = 'div',
}) {
  const reduced = useReducedMotion();
  const Component = motion[as] || motion.div;

  if (reduced) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }

  return (
    <Component
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-12% 0px -12% 0px' }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Component>
  );
}
