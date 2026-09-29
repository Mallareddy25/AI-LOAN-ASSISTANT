/**
 * EMI visualization.
 *
 * Rules from the brief:
 *  • The calculator stays authoritative — every number here comes straight
 *    from the API response. Nothing is recomputed or "prettified".
 *  • The visual responds to the inputs:
 *      - higher principal  → larger block, taller principal column
 *      - longer tenure     → longer timeline
 *      - higher interest   → bigger interest share
 *  • Transitions are smooth and interruptible (CSS transitions on geometry,
 *    no per-frame JS animation), so it stays cheap.
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

const money = (value, digits = 0) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/** Donut showing principal vs interest share. */
function ShareDonut({ principalRatio = 0, interestRatio = 0 }) {
  const total = principalRatio + interestRatio;
  const pct = total > 0 ? (interestRatio / total) * 100 : 0;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-[132px] w-[132px] shrink-0">
        <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
          <circle
            cx="66"
            cy="66"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="12"
          />
          {/* Principal share */}
          <circle
            cx="66"
            cy="66"
            r={radius}
            fill="none"
            stroke="#5B8CFF"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={0}
            opacity="0.85"
          />
          {/* Interest share drawn on top, offset to start after principal */}
          <motion.circle
            cx="66"
            cy="66"
            r={radius}
            fill="none"
            stroke="#C9A227"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={false}
            animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: '66px 66px', transform: 'rotate(0deg)' }}
          />
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <span className="text-2xs font-semibold uppercase tracking-wide2 text-mist-500">
            Interest
          </span>
          <span className="text-xl font-bold tnum text-gold-200">
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>

      <ul className="space-y-2.5 text-xs">
        <li className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-brand-400" />
          <span className="text-mist-400">Principal</span>
          <span className="ml-auto font-semibold tnum text-mist-100">
            {principalRatio.toFixed(1)}%
          </span>
        </li>
        <li className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-gold-400" />
          <span className="text-mist-400">Interest</span>
          <span className="ml-auto font-semibold tnum text-mist-100">
            {interestRatio.toFixed(1)}%
          </span>
        </li>
      </ul>
    </div>
  );
}

/** Principal block whose face scales with the loan amount. */
function PrincipalBlock({ amount }) {
  const reduced = useReducedMotion();

  // Log scale so ₹50k and ₹5cr both render legibly.
  const size = useMemo(() => {
    const value = Math.max(Number(amount) || 0, 1000);
    const t = (Math.log10(value) - 4) / 5; // 1e4 → 0, 1e9 → 1
    return 0.55 + Math.max(0, Math.min(1, t)) * 0.9;
  }, [amount]);

  return (
    <div className="flex items-end gap-4" aria-hidden="true">
      <motion.div
        className="relative rounded-2xl border border-brand-400/25"
        style={{
          background:
            'linear-gradient(150deg, rgba(91,140,255,0.32) 0%, rgba(44,84,180,0.18) 60%, rgba(11,14,20,0.4) 100%)',
          boxShadow: '0 24px 50px -24px rgba(91,140,255,0.55), inset 0 1px 0 rgba(255,255,255,0.14)',
        }}
        initial={false}
        animate={{ width: `${size * 92}px`, height: `${size * 82}px` }}
        transition={reduced ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="absolute inset-x-2.5 bottom-2.5 text-2xs font-bold tnum text-tint/85">
          ₹{money(amount)}
        </span>
        {/* Top face for a sense of extrusion. */}
        <span
          className="absolute inset-x-0 -top-2.5 h-2.5 rounded-t-md border border-brand-300/20"
          style={{ background: 'rgba(91,140,255,0.16)' }}
        />
      </motion.div>
      <div className="pb-1 text-[0.6875rem] leading-relaxed text-mist-500">
        Block size is
        <br />
        proportional to the
        <br />
        <span className="text-mist-300">loan amount</span>
      </div>
    </div>
  );
}

/** Repayment timeline whose length scales with tenure. */
function TenureRail({ years, months }) {
  const reduced = useReducedMotion();
  const total = (Number(years) || 0) + (Number(months) || 0) / 12;
  const ticks = Math.max(4, Math.min(40, Math.round(total * 4)));
  const width = 120 + Math.min(total, 30) * 7;

  return (
    <div aria-hidden="true">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-2xs font-semibold uppercase tracking-wide2 text-mist-500">
          Repayment timeline
        </span>
        <span className="text-xs font-semibold tnum text-mist-300">
          {total % 1 === 0 ? total : total.toFixed(1)} yrs
        </span>
      </div>
      <motion.div
        className="relative h-9"
        initial={false}
        animate={{ width: `${width}px` }}
        transition={reduced ? { duration: 0 } : { duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="absolute inset-x-0 top-4 h-px bg-tint/10" />
        <div className="absolute inset-x-0 top-4 h-px bg-gradient-to-r from-brand-400/70 to-gold-300/70" />
        {Array.from({ length: ticks }, (_, i) => (
          <span
            key={i}
            className="absolute top-1 h-4 w-px bg-tint/15"
            style={{ left: `${(i / Math.max(ticks - 1, 1)) * 100}%` }}
          />
        ))}
        <span
          className="absolute -top-1 h-6 w-1.5 rounded-full bg-gold-300"
          style={{
            left: 'calc(100% - 6px)',
            boxShadow: '0 0 14px 2px rgba(201,162,39,0.55)',
          }}
        />
      </motion.div>
    </div>
  );
}

export default function EMIVisualization({ result }) {
  if (!result) {
    return (
      <div className="glass glass-edge grid min-h-[260px] place-content-center p-6 text-center">
        <p className="text-sm text-mist-500">
          Enter a loan amount, rate and tenure to see the breakdown.
        </p>
      </div>
    );
  }

  const {
    principal,
    emi,
    totalInterest,
    totalPayable,
    interestRatio,
    principalRatio,
    monthlyRate,
    tenureMonths,
    scheduleLength,
  } = result;

  return (
    <div className="grid gap-5">
      {/* Headline figures */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Monthly EMI', value: `₹${money(emi, 2)}`, accent: true },
          { label: 'Principal', value: `₹${money(principal)}` },
          { label: 'Total interest', value: `₹${money(totalInterest)}` },
          { label: 'Total payable', value: `₹${money(totalPayable)}` },
        ].map((item) => (
          <div key={item.label} className="glass glass-edge px-3.5 py-3">
            <p className="text-2xs font-semibold uppercase tracking-wide2 text-mist-500">
              {item.label}
            </p>
            <p
              className={`mt-1 text-[0.95rem] font-bold tnum ${
                item.accent ? 'text-gold-200' : 'text-mist-50'
              }`}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-5">
          <div className="glass glass-edge p-5">
            <ShareDonut principalRatio={principalRatio} interestRatio={interestRatio} />
          </div>
          <div className="glass glass-edge p-5">
            <TenureRail years={Math.floor(tenureMonths / 12)} months={tenureMonths % 12} />
            <p className="mt-3 text-2xs text-mist-500 tnum">
              {scheduleLength} monthly instalments · monthly rate {Number(monthlyRate * 100).toFixed(4)}%
            </p>
          </div>
        </div>

        <div className="glass glass-edge grid place-items-center p-5">
          <PrincipalBlock amount={principal} />
        </div>
      </div>
    </div>
  );
}
