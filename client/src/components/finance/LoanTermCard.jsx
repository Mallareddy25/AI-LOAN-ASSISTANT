/**
 * 3D terminology card.
 *
 * The card itself tilts (CSS 3D) and the ₹ coin on it is a real layered
 * element that lifts away from the surface on hover via `translateZ`, which
 * gives genuine depth rather than a flat shadow.
 */
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import TiltCard from '../animations/TiltCard';

const ACCENTS = {
  Basic: '#C9A227',
  Interest: '#5B8CFF',
  Repayment: '#3FB984',
  Credit: '#A78BFA',
  Security: '#E0A93B',
  Fees: '#F0A5C0',
  Eligibility: '#4FC3D9',
};

const accentFor = (category) => ACCENTS[category] || '#8AA9FF';

/** Metallic ₹ coin used as the card's visual anchor. */
function Coin({ label, accent, size = 46 }) {
  return (
    <span
      className="coin relative grid shrink-0 place-items-center rounded-full text-ink-950"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.44,
        fontWeight: 700,
        lineHeight: 1,
        boxShadow: `0 10px 26px -12px ${accent}66, inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.3)`,
      }}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}

export default function LoanTermCard({ term, to, index = 0 }) {
  const accent = accentFor(term.category);

  return (
    <TiltCard max={6} className="group h-full">
      <Link
        to={to || `/glossary/${term.slug}`}
        className="glass glass-edge glass-hover relative flex h-full flex-col gap-4 overflow-hidden p-5 focus-visible:outline-none"
        style={{ borderColor: `${accent}26` }}
      >
        {/* Accent wash that strengthens on hover. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-40 blur-2xl transition-opacity duration-500 group-hover:opacity-70"
          style={{ background: accent }}
        />

        <div className="flex items-start gap-3.5">
          <span
            className="transition-transform duration-500 ease-premium group-hover:-translate-y-0.5"
            style={{ transform: 'translateZ(28px)' }}
          >
            <Coin label="₹" accent={accent} />
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="text-[0.95rem] font-semibold leading-snug text-mist-50">{term.term}</h3>
            <p className="mt-1 text-2xs font-semibold uppercase tracking-wide2" style={{ color: accent }}>
              {term.category}
            </p>
          </div>
        </div>

        <p className="line-clamp-4 flex-1 text-[0.8125rem] leading-relaxed text-mist-300">
          {term.shortDefinition || term.short_definition}
        </p>

        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-mist-200 transition-colors group-hover:text-mist-50">
          Learn more
          <ArrowUpRight
            size={13}
            className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          />
        </span>

        {/* Index watermark for visual rhythm across a grid. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-3 right-3 text-5xl font-bold tnum opacity-[0.04]"
        >
          {String(index + 1).padStart(2, '0')}
        </span>
      </Link>
    </TiltCard>
  );
}

export { Coin as TermCoin, accentFor as termAccent };
