/**
 * Eligibility factors + the educational estimator.
 *
 * The estimator is explicitly labelled as NOT a loan approval decision. Its
 * factor weights come from the server, not from the browser, so the scoring
 * rules live in one place.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calculator, Info, TrendingUp } from 'lucide-react';

import { api, calculatorApi } from '../services/api';
import useListPage from '../hooks/useListPage';
import PageTransition from '../components/animations/PageTransition';
import ScrollReveal from '../components/animations/ScrollReveal';
import { EligibilityVisualization } from '../components/finance';
import FilterBar from '../components/common/FilterBar';
import Pagination from '../components/common/Pagination';
import EmptyState from '../components/common/EmptyState';
import Skeleton from '../components/common/Skeleton';
import SectionHeading from '../components/common/SectionHeading';
import Disclaimer from '../components/common/Disclaimer';
import Badge from '../components/common/Badge';
import Loader from '../components/common/Loader';

const fetcher = { list: api.eligibility, categories: api.eligibilityCategories };

const IMPACT_TONE = { high: 'negative', medium: 'caution', low: 'positive' };

/* ══ Factor card ══════════════════════════════════════════════════════ */
function FactorCard({ factor }) {
  return (
    <article className="glass glass-edge flex h-full flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-tint/10 bg-tint/[0.05] text-sm"
            aria-hidden="true"
          >
            {factor.icon || '•'}
          </span>
          <h3 className="text-sm font-semibold leading-snug text-mist-50">{factor.factor}</h3>
        </div>
        <Badge tone={IMPACT_TONE[factor.impact] || 'neutral'}>
          {factor.impact} impact
        </Badge>
      </div>

      <p className="text-[0.8125rem] font-medium leading-relaxed text-mist-200">{factor.summary}</p>

      {factor.explanation && (
        <p className="text-xs leading-relaxed text-mist-400">{factor.explanation}</p>
      )}

      {factor.typicalConsideration && (
        <p className="mt-auto rounded-lg border border-tint/[0.07] bg-tint/[0.02] p-3 text-xs leading-relaxed text-mist-300">
          <span className="font-semibold text-mist-200">General guidance: </span>
          {factor.typicalConsideration}
        </p>
      )}

      <p className="text-2xs font-semibold uppercase tracking-wide2 text-mist-600">
        {factor.category}
      </p>
    </article>
  );
}

/* ══ Educational estimator ════════════════════════════════════════════ */
function Estimator() {
  const [form, setForm] = useState({
    age: 26,
    employmentType: 'salaried',
    monthlyIncome: 60000,
    existingEmis: 5000,
    creditScore: 720,
    loanAmount: 500000,
    loanType: 'Personal Loan',
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => {
    const value =
      event.target.type === 'number' ? Number(event.target.value) : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setResult(await calculatorApi.estimate(form));
    } catch (err) {
      setError(err.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const bandColour = {
    strong: 'text-positive',
    moderate: 'text-caution',
    limited: 'text-mist-300',
  };

  return (
    <section className="glass glass-edge overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-tint/[0.07] px-6 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-50">
            <Calculator size={15} className="text-gold-300" />
            Educational Estimate — Not a Loan Approval Decision
          </h2>
          <p className="mt-1 text-xs text-mist-500">
            Shows how lenders <em>typically</em> weigh these factors. Nothing here is a decision.
          </p>
        </div>
        {result && (
          <div className="text-right">
            <p className="text-2xs font-semibold uppercase tracking-wide2 text-mist-500">Band</p>
            <p className={`text-lg font-bold capitalize ${bandColour[result.band] || 'text-mist-200'}`}>
              {result.band}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1.15fr]">
        {/* Form */}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="est-age" className="label">
                Age
              </label>
              <input
                id="est-age"
                type="number"
                min={18}
                max={80}
                value={form.age}
                onChange={set('age')}
                className="field tnum"
                required
              />
            </div>
            <div>
              <label htmlFor="est-type" className="label">
                Employment
              </label>
              <select
                id="est-type"
                value={form.employmentType}
                onChange={set('employmentType')}
                className="field"
              >
                <option value="salaried">Salaried</option>
                <option value="self-employed">Self-employed</option>
                <option value="business">Business</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="est-income" className="label">
              Monthly income — ₹{Number(form.monthlyIncome).toLocaleString('en-IN')}
            </label>
            <input
              id="est-income"
              type="range"
              min={10000}
              max={500000}
              step={1000}
              value={form.monthlyIncome}
              onChange={set('monthlyIncome')}
              className="w-full accent-gold-400"
            />
          </div>

          <div>
            <label htmlFor="est-emis" className="label">
              Existing monthly EMIs — ₹{Number(form.existingEmis).toLocaleString('en-IN')}
            </label>
            <input
              id="est-emis"
              type="range"
              min={0}
              max={200000}
              step={500}
              value={form.existingEmis}
              onChange={set('existingEmis')}
              className="w-full accent-gold-400"
            />
          </div>

          <div>
            <label htmlFor="est-credit" className="label">
              Credit score — {form.creditScore}
            </label>
            <input
              id="est-credit"
              type="range"
              min={300}
              max={900}
              step={10}
              value={form.creditScore}
              onChange={set('creditScore')}
              className="w-full accent-gold-400"
            />
          </div>

          <div>
            <label htmlFor="est-amount" className="label">
              Loan amount — ₹{Number(form.loanAmount).toLocaleString('en-IN')}
            </label>
            <input
              id="est-amount"
              type="number"
              min={10000}
              step={1000}
              value={form.loanAmount}
              onChange={set('loanAmount')}
              className="field tnum"
            />
          </div>

          <div>
            <label htmlFor="est-loantype" className="label">
              Loan type
            </label>
            <input
              id="est-loantype"
              type="text"
              value={form.loanType}
              onChange={set('loanType')}
              className="field"
              placeholder="e.g. Personal Loan"
            />
          </div>

          <button type="submit" disabled={busy} className="btn-gold w-full">
            {busy ? <Loader size={15} /> : <TrendingUp size={15} />}
            {busy ? 'Estimating…' : 'Run the estimate'}
          </button>

          {error && <p className="text-xs text-negative">{error}</p>}
        </form>

        {/* Result */}
        <div className="rounded-2xl border border-tint/[0.07] bg-ink-950/50 p-5">
          {!result ? (
            <div className="grid h-full min-h-[280px] place-content-center text-center">
              <p className="text-sm text-mist-500">
                Adjust the inputs and run the estimate to see how the factors are typically weighted.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 shrink-0">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="#C9A227"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={2 * Math.PI * 42 * (1 - result.score / 100)}
                    />
                  </svg>
                  <div className="absolute inset-0 grid place-content-center">
                    <span className="text-lg font-bold tnum text-mist-50">{result.score}</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-mist-300">{result.summary}</p>
              </div>

              <ul className="mt-5 space-y-3">
                {result.factors.map((factor) => (
                  <li key={factor.label}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs font-semibold text-mist-200">{factor.label}</span>
                      <span className="text-2xs tnum text-mist-500">
                        {factor.points}/{factor.weight}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-tint/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-400 to-gold-300 transition-[width] duration-500"
                        style={{ width: `${(factor.points / factor.weight) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-mist-500">
                      {factor.detail}
                    </p>
                  </li>
                ))}
              </ul>

              <p className="mt-5 flex gap-2 rounded-lg border border-caution/20 bg-caution/[0.06] p-3 text-[0.6875rem] leading-relaxed text-mist-300">
                <Info size={12} className="mt-0.5 shrink-0 text-caution" />
                This is a general educational observation based only on the values you entered. It is
                not a loan approval decision, an offer, or personalised financial advice.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ══ Page ═════════════════════════════════════════════════════════════ */
export default function EligibilityPage() {
  const list = useListPage(fetcher, { initialLimit: 12 });

  const impactCounts = useMemo(() => {
    if (list.meta?.impacts) return list.meta.impacts;
    return null;
  }, [list.meta]);

  return (
    <PageTransition>
      <div className="shell pb-16 pt-[calc(var(--nav-h)+3rem)]">
        <SectionHeading
          eyebrow="Eligibility"
          title="What lenders actually look at"
          lede="There is no single pass-or-fail rule. These are the factors that carry the most weight, how they interact, and what that means in practice."
        />

        <div className="mt-10 hidden lg:block">
          <EligibilityVisualization impactCounts={impactCounts} />
        </div>

        <div className="mt-10">
          <Estimator />
        </div>

        <div className="mt-12">
          <div>
            <h2 className="text-lg font-semibold">All eligibility factors</h2>
            <p className="mt-1.5 text-sm text-mist-400">
              Grouped and ranked by how much each one typically influences the outcome.
            </p>
          </div>

          <div className="mt-6">
            <FilterBar
              search={list.search}
              onSearchChange={list.setSearch}
              category={list.category}
              onCategoryChange={list.setCategory}
              categories={list.categories}
              placeholder="Search factors…"
              allLabel="All factors"
              resultLabel={
                !list.loading && list.pagination?.total
                  ? `${list.pagination.total} factors`
                  : undefined
              }
            />
          </div>

          {list.loading ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="h-52" />
              ))}
            </div>
          ) : list.error ? (
            <EmptyState title="Could not load eligibility factors" description={list.error} />
          ) : list.items.length === 0 ? (
            <EmptyState
              title="No factors match that search"
              description="Try another keyword, or clear the filters."
              action={
                <button type="button" className="btn-ghost btn-sm mt-2" onClick={list.clearFilters}>
                  Clear filters
                </button>
              }
            />
          ) : (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.items.map((factor, index) => (
                <ScrollReveal key={factor.id} delay={Math.min(index, 7) * 0.04}>
                  <FactorCard factor={factor} />
                </ScrollReveal>
              ))}
            </div>
          )}

          {!list.loading && !list.error && (
            <Pagination
              page={list.pagination?.page || 1}
              totalPages={list.pagination?.totalPages || 1}
              total={list.pagination?.total || 0}
              onChange={list.setPage}
              label="factors"
            />
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Disclaimer variant="full" text={list.meta?.disclaimer?.full} className="flex-1" />
          <Link to="/chat" className="btn-gold">
            Ask about eligibility
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </PageTransition>
  );
}
