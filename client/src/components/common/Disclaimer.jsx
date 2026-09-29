import { Info } from 'lucide-react';

const DEFAULT_FULL =
  'This assistant provides educational information about loans and does not provide loan approval, financial advice, or guarantees. Actual loan terms and eligibility depend on the respective lender and current policies.';

/**
 * The mandatory product disclaimer.
 * `variant="inline"` is the short line; `variant="full"` is the long statement.
 */
export default function Disclaimer({ variant = 'inline', text, className = '' }) {
  if (variant === 'full') {
    return (
      <aside
        className={`glass glass-edge flex gap-3 p-5 ${className}`}
        role="note"
        aria-label="Educational disclaimer"
      >
        <Info size={16} className="mt-0.5 shrink-0 text-gold-300" strokeWidth={2} />
        <p className="text-[0.8125rem] leading-relaxed text-mist-300">
          {text || DEFAULT_FULL}
        </p>
      </aside>
    );
  }

  return (
    <p className={`flex items-start gap-2 text-xs leading-relaxed text-mist-500 ${className}`}>
      <Info size={13} className="mt-px shrink-0 text-gold-400/70" strokeWidth={2} />
      <span>
        {text ||
          'Educational information only — not a loan approval decision or personalised financial advice.'}
      </span>
    </p>
  );
}
