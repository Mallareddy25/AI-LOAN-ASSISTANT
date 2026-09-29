/**
 * Repayment guide: the 3D timeline plus a live prepayment explorer.
 *
 * The prepayment numbers come straight from `/calculator/prepayment`, so the
 * "should I prepay?" comparison is the server's maths, not the browser's.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Percent, CalendarCheck, Info } from 'lucide-react';

import { calculatorApi } from '../services/api';
import PageTransition from '../components/animations/PageTransition';
import ScrollReveal from '../components/animations/ScrollReveal';
import { RepaymentTimeline } from '../components/finance';
import SectionHeading from '../components/common/SectionHeading';
import Disclaimer from '../components/common/Disclaimer';
import Loader from '../components/common/Loader';
import Card from '../components/common/Card';

const money = (value, digits = 0) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

function PrepaymentExplorer() {
  const [form, setForm] = useState({
    principal: 1000000,
    annualRate: 11,
    tenureYears: 20,
    yearsElapsed: 5,
    extraPayment: 100000,
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(await calculatorApi.prepayment(form));
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const saving = result ? result.interestSaved : 0;

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-tint/[0.07] px-6 py-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-mist-50">
          <Percent size={15} className="text-gold-300" />
          What would prepaying actually save?
        </h3>
        <p className="mt-1 text-xs text-mist-500">
          Compare paying the loan as scheduled against adding a one-off payment after{' '}
          {form.yearsElapsed} {form.yearsElapsed === 1 ? 'year' : 'years'}.
        </p>
      </div>

      <form onSubmit={submit} className="grid gap-6 p-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div>
            <label htmlFor="pp-amount" className="label">
              Original loan amount
            </label>
            <input
              id="pp-amount"
              type="number"
              min={50000}
              step={10000}
              value={form.principal}
              onChange={(event) => set('principal', Number(event.target.value))}
              className="field tnum"
            />
          </div>
          <div>
            <label htmlFor="pp-rate" className="label">
              Interest rate — {form.annualRate}% p.a.
            </label>
            <input
              id="pp-rate"
              type="range"
              min={0}
              max={30}
              step={0.5}
              value={form.annualRate}
              onChange={(event) => set('annualRate', Number(event.target.value))}
              className="w-full accent-gold-400"
            />
          </div>
          <div>
            <label htmlFor="pp-tenure" className="label">
              Tenure — {form.tenureYears} years
            </label>
            <input
              id="pp-tenure"
              type="range"
              min={1}
              max={30}
              step={1}
              value={form.tenureYears}
              onChange={(event) => set('tenureYears', Number(event.target.value))}
              className="w-full accent-gold-400"
            />
          </div>
          <div>
            <label htmlFor="pp-elapsed" className="label">
              Years already paid — {form.yearsElapsed}
            </label>
            <input
              id="pp-elapsed"
              type="range"
              min={0}
              max={Math.max(0, form.tenureYears - 1)}
              step={1}
              value={form.yearsElapsed}
              onChange={(event) => set('yearsElapsed', Number(event.target.value))}
              className="w-full accent-gold-400"
            />
          </div>
          <div>
            <label htmlFor="pp-extra" className="label">
              One-off prepayment — ₹{money(form.extraPayment)}
            </label>
            <input
              id="pp-extra"
              type="range"
              min={10000}
              max={1000000}
              step={10000}
              value={form.extraPayment}
              onChange={(event) => set('extraPayment', Number(event.target.value))}
              className="w-full accent-gold-400"
            />
          </div>

          <button type="submit" disabled={busy} className="btn-gold w-full">
            {busy ? <Loader size={15} /> : <CalendarCheck size={15} />}
            Compare both paths
          </button>
          {error && <p className="text-xs text-negative">{error}</p>}
        </div>

        <div className="rounded-2xl border border-tint/[0.07] bg-ink-950/50 p-5">
          {!result ? (
            <div className="grid h-full min-h-[240px] place-content-center text-center">
              <p className="max-w-xs text-sm text-mist-500">
                Run the comparison to see the interest saved and the months you would have to
                continue paying.
              </p>
            </div>
          ) : (
            <div>
              <div className="rounded-xl border border-positive/25 bg-positive/[0.07] p-4">
                <p className="text-2xs font-semibold uppercase tracking-wide2 text-mist-400">
                  Interest saved by prepaying
                </p>
                <p className="mt-1 text-2xl font-bold tnum text-positive">
                  ₹{money(saving)}
                </p>
                <p className="mt-1 text-xs text-mist-400">
                  and the loan closes about{' '}
                  <span className="font-semibold text-mist-200">
                    {result.monthsSaved} months
                  </span>{' '}
                  earlier.
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-tint/[0.07] bg-tint/[0.02] p-4">
                  <p className="text-2xs font-semibold uppercase tracking-wide2 text-mist-500">
                    As scheduled
                  </p>
                  <p className="mt-2 text-sm font-semibold text-mist-100">
                    ₹{money(result.regular.emi)} × {result.regular.totalMonths}
                  </p>
                  <p className="mt-1 text-xs text-mist-400">
                    Total interest ₹{money(result.regular.totalInterest)}
                  </p>
                </div>
                <div className="rounded-xl border border-gold-400/25 bg-gold-400/[0.06] p-4">
                  <p className="text-2xs font-semibold uppercase tracking-wide2 text-gold-300">
                    With prepayment
                  </p>
                  <p className="mt-2 text-sm font-semibold text-mist-100">
                    ₹{money(result.prepaid.emi)} ×{' '}
                    {result.prepaid.totalMonths - result.monthsSaved}
                  </p>
                  <p className="mt-1 text-xs text-mist-400">
                    Total interest ₹{money(result.prepaid.totalInterest)}
                  </p>
                </div>
              </div>

              <p className="mt-4 flex gap-2 rounded-lg border border-tint/[0.07] bg-tint/[0.02] p-3 text-[0.6875rem] leading-relaxed text-mist-400">
                <Info size={12} className="mt-0.5 shrink-0 text-mist-500" />
                Prepayment penalties and the effect on your credit history vary by lender. Confirm
                the current terms with the lender before making an early payment.
              </p>
            </div>
          )}
        </div>
      </form>
    </Card>
  );
}

export default function RepaymentPage() {
  return (
    <PageTransition>
      <div className="shell pb-16 pt-[calc(var(--nav-h)+3rem)]">
        <SectionHeading
          eyebrow="Repayment"
          title="The life of a loan, start to finish"
          lede="Disbursement, first EMI, the split between principal and interest, the balance falling, and finally closure — plus what changes if you prepay."
        />

        <div className="mt-12">
          <RepaymentTimeline />
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {[
            {
              title: 'The EMI is constant',
              body: 'In a reducing-balance loan the EMI stays the same, but the interest portion shrinks every month and the principal portion grows. Early payments are more effective than late ones.',
            },
            {
              title: 'Missed EMIs compound',
              body: 'A missed EMI can be reported to credit bureaus, add late fees, and in some cases push the account into collections. Contact the lender early if you cannot pay.',
            },
            {
              title: 'Prepayment has two levers',
              body: 'You can either cut the tenure — keeping the EMI the same and paying less total interest — or cut the EMI — keeping the tenure and freeing monthly cash flow.',
            },
          ].map((item, index) => (
            <ScrollReveal key={item.title} delay={index * 0.06}>
              <Card className="h-full">
                <h3 className="text-sm font-semibold text-mist-50">{item.title}</h3>
                <p className="mt-2.5 text-[0.8125rem] leading-relaxed text-mist-300">{item.body}</p>
              </Card>
            </ScrollReveal>
          ))}
        </div>

        <div className="mt-10">
          <PrepaymentExplorer />
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Disclaimer variant="full" className="flex-1" />
          <Link to="/calculator" className="btn-gold shrink-0">
            Open the EMI calculator
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </PageTransition>
  );
}
