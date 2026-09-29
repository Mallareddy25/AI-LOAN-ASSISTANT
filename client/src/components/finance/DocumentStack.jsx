/**
 * 3D document stack.
 *
 * Cards are placed with real CSS `transform: rotateY/rotateX/translateZ` so
 * they have genuine perspective and depth. As the section gains scroll focus
 * the cards fan out from a tight stack into an organised, readable row —
 * a scroll-driven transition rather than a fade.
 */
import { useEffect, useRef } from 'react';
import { sectionFocus } from '../../utils/scrollEngine';
import { usePrefersReducedMotion, useIsTouch } from '../../hooks';

const CATEGORY_ICON = {
  Identity: 'ID',
  Income: '₹',
  Address: '⌂',
  Employment: '▣',
  Credit: '◎',
  Property: '▤',
  Vehicle: '⛊',
  Education: '⌂',
  Business: '▦',
  Asset: '◈',
  Other: '•',
};

export default function DocumentStack({ documents = [], max = 6 }) {
  const root = useRef(null);
  const cardRefs = useRef([]);
  const reduced = usePrefersReducedMotion();
  const touch = useIsTouch();

  const items = documents.slice(0, max);

  useEffect(() => {
    if (reduced || touch || !root.current) return undefined;
    let raf = null;

    const loop = () => {
      const focus = sectionFocus('documents');
      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        // Each card starts slightly further back and swings out on its own delay.
        const delay = index * 0.08;
        const local = Math.max(0, Math.min(1, (focus - delay) / Math.max(0.001, 1 - delay)));

        const stackedX = 0;
        const stackedZ = -60 - index * 26;
        const stackedRot = -14;

        const spreadX = (index - (items.length - 1) / 2) * 92;
        const spreadZ = index * 6;
        const spreadRot = (index - (items.length - 1) / 2) * 4;

        const x = stackedX + (spreadX - stackedX) * local;
        const z = stackedZ + (spreadZ - stackedZ) * local;
        const rotY = stackedRot + (spreadRot - stackedRot) * local;
        const rotX = -8 + 8 * local;
        const scale = 0.82 + 0.18 * local;

        card.style.transform = `translate3d(${x.toFixed(1)}px, ${(index * 10).toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        card.style.opacity = String(0.35 + local * 0.65);
        card.style.zIndex = String(Math.round(local * 100 + index));
      });
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced, touch, items.length]);

  if (!items.length) return null;

  return (
    <div
      ref={root}
      className="relative"
      style={{ perspective: '1400px', minHeight: 300 }}
      aria-hidden="true"
    >
      <div
        className="relative flex min-h-[300px] items-center justify-center"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {items.map((doc, index) => (
          <div
            key={doc.id ?? index}
            ref={(node) => {
              cardRefs.current[index] = node;
            }}
            className="glass glass-edge absolute flex w-[150px] flex-col gap-2 rounded-xl p-3.5"
            style={{
              transformStyle: 'preserve-3d',
              transition: reduced || touch ? 'none' : 'opacity 0.2s linear',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="grid h-7 w-7 place-items-center rounded-lg border border-tint/10 bg-tint/[0.05] text-2xs font-bold text-gold-300"
              >
                {CATEGORY_ICON[doc.category] || '•'}
              </span>
              <span className="text-2xs font-semibold uppercase tracking-wide2 text-mist-500">
                {doc.category}
              </span>
            </div>
            <p className="line-clamp-3 text-[0.6875rem] font-semibold leading-snug text-mist-100">
              {doc.title}
            </p>
            <div className="mt-auto space-y-1">
              <div className="h-1 rounded-full bg-tint/10" style={{ width: '86%' }} />
              <div className="h-1 rounded-full bg-tint/[0.07]" style={{ width: '64%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Plain, accessible text list of the same documents for screen readers. */
export function DocumentList({ documents = [] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {documents.map((doc) => (
        <li key={doc.id ?? doc.title} className="glass glass-edge flex gap-3 p-4">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-tint/10 bg-tint/[0.05] text-2xs font-bold text-gold-300">
            {CATEGORY_ICON[doc.category] || '•'}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-mist-50">{doc.title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-mist-400">{doc.description}</p>
            {doc.whyNeeded && (
              <p className="mt-1.5 text-xs leading-relaxed text-mist-500">
                <span className="font-semibold text-mist-300">Why: </span>
                {doc.whyNeeded}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export { CATEGORY_ICON };
