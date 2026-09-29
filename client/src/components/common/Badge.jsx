/** Small status/label pill. */
export default function Badge({ children, tone = 'neutral', className = '' }) {
  const tones = {
    neutral: 'border-tint/10 bg-tint/[0.04] text-mist-300',
    gold: 'border-gold-400/30 bg-gold-400/10 text-gold-200',
    brand: 'border-brand-400/30 bg-brand-400/10 text-brand-200',
    positive: 'border-positive/30 bg-positive/10 text-positive',
    caution: 'border-caution/30 bg-caution/10 text-caution',
    negative: 'border-negative/30 bg-negative/10 text-negative',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-2xs font-semibold ${tones[tone] || tones.neutral} ${className}`}
    >
      {children}
    </span>
  );
}
