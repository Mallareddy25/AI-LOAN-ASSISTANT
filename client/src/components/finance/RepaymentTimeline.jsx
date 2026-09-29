/**
 * 3D repayment timeline: Loan → EMI → Principal + Interest → Balance → Closure.
 *
 * Rendered as a perspective rail of stages. Scroll focus drives each stage's
 * lift and the travelling "payment" marker along the rail, so the story of a
 * loan's life plays out as the reader scrolls.
 */
import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { sectionFocus } from '../../utils/scrollEngine';
import { usePrefersReducedMotion } from '../../hooks';

const STAGES = [
  {
    key: 'loan',
    title: 'Loan disbursed',
    body: 'You receive the sanctioned amount. The principal is what you actually borrowed.',
    accent: '#5B8CFF',
    icon: '₹',
  },
  {
    key: 'emi',
    title: 'Repayment starts',
    body: 'From the first due date you pay a fixed EMI until the tenure ends.',
    accent: '#C9A227',
    icon: 'EMI',
  },
  {
    key: 'split',
    title: 'Principal + Interest',
    body: 'Every EMI splits into an interest part and a principal part. Early on, most of it is interest.',
    accent: '#A78BFA',
    icon: 'P+I',
  },
  {
    key: 'balance',
    title: 'Balance falls to zero',
    body: 'As the outstanding balance shrinks, the interest part of each EMI shrinks with it.',
    accent: '#3FB984',
    icon: '0',
  },
  {
    key: 'closure',
    title: 'Loan closure',
    body: 'The final EMI clears the balance. You receive a no-dues certificate and the bureau record updates.',
    accent: '#E0A93B',
    icon: '✓',
  },
];

export default function RepaymentTimeline() {
  const root = useRef(null);
  const stageRefs = useRef([]);
  const markerRef = useRef(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || !root.current) return undefined;
    let raf = null;

    const loop = () => {
      const focus = sectionFocus('repayment');

      stageRefs.current.forEach((node, index) => {
        if (!node) return;
        const delay = index * 0.14;
        const local = Math.max(0, Math.min(1, (focus - delay) / Math.max(0.001, 1 - delay)));
        node.style.setProperty('--lift', (local * 16 - 6).toFixed(2));
        node.style.setProperty('--on', local.toFixed(3));
        node.style.setProperty('--rotateY', `${(1 - local) * 16 - 8}`.concat('deg'));
      });

      // Marker travels the rail as focus increases.
      if (markerRef.current) {
        const t = Math.max(0, Math.min(1, (focus - 0.06) / 0.88));
        markerRef.current.style.setProperty('--travel', `${(t * 100).toFixed(2)}%`);
        markerRef.current.style.opacity = String(0.25 + Math.sin(t * Math.PI) * 0.75);
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <div ref={root} className="relative">
      {/* Rail */}
      <div className="relative mb-8 h-px w-full bg-tint/[0.08]">
        <div
          ref={markerRef}
          className="absolute -top-[3px] h-1.5 rounded-full bg-gradient-to-r from-brand-400 via-gold-300 to-positive transition-none"
          style={{
            left: 'var(--travel, 0%)',
            width: 26,
            transform: 'translateX(-50%)',
            boxShadow: '0 0 16px 2px rgba(201,162,39,0.45)',
            opacity: 0.3,
          }}
          aria-hidden="true"
        />
      </div>

      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STAGES.map((stage, index) => (
          <li
            key={stage.key}
            ref={(node) => {
              stageRefs.current[index] = node;
            }}
            className="glass glass-edge relative flex flex-col gap-2.5 p-4"
            style={{
              // Driven per-frame by the rAF loop above.
              transform:
                'perspective(900px) translateY(calc(var(--lift, 0) * 1px)) rotateY(var(--rotateY, 0deg))',
              opacity: 'calc(0.42 + var(--on, 0) * 0.58)',
              borderColor: `color-mix(in srgb, ${stage.accent} 26%, transparent)`,
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="grid h-9 w-9 place-items-center rounded-xl text-2xs font-bold"
                style={{
                  background: `${stage.accent}1F`,
                  color: stage.accent,
                  boxShadow: `inset 0 0 0 1px ${stage.accent}33`,
                }}
              >
                {stage.icon}
              </span>
              <span className="text-2xs font-semibold tnum text-mist-600">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>

            <h3 className="text-sm font-semibold leading-snug text-mist-50">{stage.title}</h3>
            <p className="text-xs leading-relaxed text-mist-400">{stage.body}</p>
          </li>
        ))}
      </ol>

      <p className="mt-6 text-xs text-mist-500">
        Prepayment and foreclosure can change this path.{' '}
        <Link to="/glossary/prepayment" className="font-semibold text-brand-300 hover:text-brand-200">
          Learn about prepayment →
        </Link>
      </p>
    </div>
  );
}
