/**
 * Page transition wrapper.
 *
 * Uses framer Motion's `AnimatePresence` in `App.jsx`; this component is the
 * per-page half of the contract. Kept fast (220ms) so navigation never feels
 * sluggish, and reduced-motion aware.
 */
import { motion, useReducedMotion } from 'framer-motion';

const VARIANTS = {
  initial: { opacity: 0, y: 12, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -8, filter: 'blur(3px)' },
};

export default function PageTransition({ children, className = '' }) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={VARIANTS}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export { VARIANTS as pageTransitionVariants };
