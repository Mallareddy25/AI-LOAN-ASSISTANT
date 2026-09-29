/**
 * Full EMI calculator.
 *
 * The API is authoritative: it returns the EMI, the total interest, the total
 * payable and the full amortisation schedule, and this page renders them
 * verbatim. Nothing is recomputed in the browser.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Download, Info, Table2 } from 'lucide-react';

import { calculatorApi } from '../services/api';
import PageTransition from '../components/animations/PageTransition';
import { EMIVisualization } from '../components/finance';
import SectionHeading from '../components/common/SectionHeading';
import Disclaimer from '../components/common/Disclaimer';
import Loader from '../components/common/Loader';
import Card from '../components/common/Card';

const money = (value, digits = 2) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const MONTHS_PER_YEAR = 12;

function Stat({ label, value, tone = 'text-mist-50', hint }) {
  return (
    <div className="rounded-xl border border-tint/[0.07] bg-tint/[0.02] p-4">
      <p className="text-2xs font-semibold uppercase tracking-wide2 text-mist-500">{label}</p>
      <p className={`mt-1.5 text-lg font-bold tnum ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[0.6875rem] text-mist-500">{hint}</p>}
    </div>
  );
}

/** Amortisation schedule rendered as a scrollable table. */
function ScheduleTable({ schedule }) {
  const [expanded, setExpanded] = useState(false);
  const rows = useMemo(
    () => (expanded ? schedule : schedule.slice(0, 12)),
    [schedule, expanded],
  );

  if (!schedule?.length) return null;

  return (
    <Card className="mt-6 overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-tint/[0.07] px-5 py-3.5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-mist-50">
          <Table2 size={15} className="text-gold-300" />
          Amortisation schedule
        </h3>
        <p className="text-2xs tnum text-mist-500">
          {schedule.length} payments
        </p>
      </div>

      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="sticky top-0 bg-ink-900/95 backdrop-blur">
            <tr className="text-2xs uppercase tracking-wide2 text-mist-500">
              <th className="px-5 py-2.5 font-semibold">#</th>
              <th className="px-3 py-2.5 font-semibold">Payment</th>
              <th className="px-3 py-2.5 font-semibold">Principal</th>
              <th className="px-3 py-2.5 font-semibold">Interest</th>
              <th className="px-5 py-2.5 text-right font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody className="tnum">
            {rows.map((row, index) => (
              <tr
                key={row.paymentNumber ?? index}
                className="border-t border-tint/[0.05] text-mist-300 transition-colors hover:bg-tint/[0.02]"
              >
                <td className="px-5 py-2 text-mist-500">{row.paymentNumber ?? index + 1}</td>
                <td className="px-3 py-2 text-mist-200">₹{money(row.payment, 0)}</td>
                <td className="px-3 py-2 text-positive">₹{money(row.principal, 0)}</td>
                <td className="px-3 py-2 text-mist-400">₹{money(row.interest, 0)}</td>
                <td className="px-5 py-2 text-right text-mist-200">₹{money(row.remainingBalance, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {schedule.length > 12 && (
        <div className="border-t border-tint/[0.07] px-5 py-3">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="btn-ghost btn-sm"
          >
            {expanded ? 'Show first 12 payments' : `Show all ${schedule.length} payments`}
          </button>
        </div>
      )}
    </Card>
  );
}

export default function CalculatorPage() {
  const [form, setForm] = useState({ principal: 500000, annualRate: 12, tenureYears: 3 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setError(null);
    calculatorApi
      .emi(form)
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setResult(null);
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.principal, form.annualRate, form.tenureYears]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const downloadSchedule = () => {
    if (!result?.schedule?.length) return;
    const header = 'Payment,Principal,Interest,Balance';
    const lines = result.schedule.map(
      (row) =>
        `${row.paymentNumber},${row.principal.toFixed(2)},${row.interest.toFixed(2)},${row.remainingBalance.toFixed(2)}`,
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'amortisation-schedule.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageTransition>
      <div className="shell pb-16 pt-[calc(var(--nav-h)+3rem)]">
        <SectionHeading
          eyebrow="Calculator"
          title="See exactly what a loan costs"
          lede="Move the sliders. Every figure is computed with the same standard amortisation formula used for reducing-balance loans, then broken down payment by payment."
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Inputs */}
          <Card className="h-fit lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)]">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-50">
              <Calculator size={15} className="text-gold-300" />
              Loan parameters
            </h2>

            <div className="mt-5 space-y-5">
              <div>
                <label htmlFor="calc-amount" className="label">
                  Loan amount — ₹{money(form.principal, 0)}
                </label>
                <input
                  id="calc-amount"
                  type="range"
                  min={50000}
                  max={10000000}
                  step={10000}
                  value={form.principal}
                  onChange={(event) => update('principal', Number(event.target.value))}
                  className="w-full accent-gold-400"
                />
              </div>

              <div>
                <label htmlFor="calc-rate" className="label">
                  Interest rate — {form.annualRate}% p.a.
                </label>
                <input
                  id="calc-rate"
                  type="range"
                  min={0}
                  max={30}
                  step={0.05}
                  value={form.annualRate}
                  onChange={(event) => update('annualRate', Number(event.target.value))}
                  className="w-full accent-gold-400"
                />
              </div>

              <div>
                <label htmlFor="calc-tenure" className="label">
                  Tenure — {form.tenureYears} years
                </label>
                <input
                  id="calc-tenure"
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={form.tenureYears}
                  onChange={(event) => update('tenureYears', Number(event.target.value))}
                  className="w-full accent-gold-400"
                />
              </div>
            </div>

            {error && <p className="mt-4 text-xs text-negative">{error}</p>}

            {result && (
              <div className="mt-5 space-y-2.5 border-t border-tint/[0.07] pt-5">
                <Stat label="Monthly EMI" value={`₹${money(result.emi)}`} tone="text-gold-200" />
                <div className="grid grid-cols-2 gap-2.5">
                  <Stat label="Total interest" value={`₹${money(result.totalInterest, 0)}`} />
                  <Stat label="Total payable" value={`₹${money(result.totalPayable, 0)}`} />
                </div>
                <p className="text-2xs tnum text-mist-500">
                  {result.totalMonths} years ·{' '}
                  {result.months || result.totalMonths * MONTHS_PER_YEAR} payments
                </p>
              </div>
            )}

            {busy && (
              <p className="mt-4 flex items-center gap-2 text-xs text-mist-500">
                <Loader size={13} />
                Recalculating…
              </p>
            )}
          </Card>

          {/* Visualisation */}
          <div className="min-w-0">
            {result ? (
              <div className={busy ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
                <EMIVisualization result={result} />
              </div>
            ) : (
              !error && <Card className="h-64 animate-pulse" />
            )}

            {result?.schedule?.length > 0 && (
              <>
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={downloadSchedule} className="btn-ghost btn-sm">
                    <Download size={13} />
                    Download schedule (CSV)
                  </button>
                </div>
                <ScheduleTable schedule={result.schedule} />
              </>
            )}

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Disclaimer variant="full" />
              <Card>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-mist-50">
                  <Info size={14} className="text-mist-400" />
                  About these numbers
                </h3>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-mist-400">
                  This is a standard reducing-balance calculation. Processing fees, insurance,
                  prepayment penalties and lender-specific interest schemes are not included, so your
                  actual outgo will be higher than the total shown here.
                </p>
                <Link to="/repayment" className="btn-ghost btn-sm mt-3">
                  Understand repayment
                </Link>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
