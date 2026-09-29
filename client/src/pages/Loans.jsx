/**
 * Loan type catalogue + detail.
 *
 * Data source: `/loans` and `/loans/:slug`, both of which already include the
 * rate note and disclaimer from the server so they can never drift from the
 * backend's copy.
 */
import { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  FileText,
  Wallet,
  CalendarClock,
  Percent,
  Sparkles,
} from 'lucide-react';

import { api } from '../services/api';
import PageTransition from '../components/animations/PageTransition';
import TiltCard from '../components/animations/TiltCard';
import ScrollReveal from '../components/animations/ScrollReveal';
import { LoanTermCard } from '../components/finance';
import { DocumentList } from '../components/finance/DocumentStack';
import Disclaimer from '../components/common/Disclaimer';
import Badge from '../components/common/Badge';
import Spinner from '../components/common/Spinner';
import EmptyState from '../components/common/EmptyState';
import SectionHeading from '../components/common/SectionHeading';
import { useAsync } from '../hooks/useAsync';

/* ══ Catalogue ═════════════════════════════════════════════════════════ */
export function LoansPage() {
  const { data, loading, error } = useAsync(() => api.loans(), []);
  const rateNote = data?.__rateNote;

  return (
    <PageTransition>
      <div className="shell pb-16 pt-[calc(var(--nav-h)+3rem)]">
        <SectionHeading
          eyebrow="Loan types"
          title="Every kind of loan, explained plainly"
          lede="Each card covers what the loan is for, how interest works, what documents are needed and the trade-offs worth knowing before you apply."
        />

        {loading && <Spinner label="Loading loan types" />}
        {error && <EmptyState title="Could not load loan types" description={error} />}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data || []).map((loan, index) => (
            <ScrollReveal key={loan.id} delay={Math.min(index, 6) * 0.05}>
              <TiltCard max={6} className="h-full">
                <Link
                  to={`/loans/${loan.slug}`}
                  className="glass glass-edge glass-hover group flex h-full flex-col p-5"
                  style={{ borderColor: `${loan.accent || '#5B8CFF'}26` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="grid h-11 w-11 place-items-center rounded-xl text-lg"
                      style={{
                        background: `${loan.accent || '#5B8CFF'}1A`,
                        boxShadow: `inset 0 0 0 1px ${loan.accent || '#5B8CFF'}33`,
                      }}
                      aria-hidden="true"
                    >
                      {loan.icon || '₹'}
                    </span>
                    <span className="text-2xs font-semibold tnum text-mist-600">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <h3 className="mt-4 text-base font-semibold text-mist-50">{loan.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-mist-400">{loan.tagline}</p>

                  <p className="mt-3 line-clamp-3 flex-1 text-[0.8125rem] leading-relaxed text-mist-300">
                    {loan.whatItIs}
                  </p>

                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-mist-200 transition-colors group-hover:text-gold-200">
                    Read the guide
                    <ArrowRight
                      size={13}
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </TiltCard>
            </ScrollReveal>
          ))}
        </div>

        {rateNote && <Disclaimer className="mt-8" text={rateNote} />}
        <Disclaimer variant="full" className="mt-4" />
      </div>
    </PageTransition>
  );
}

/* ══ Detail ════════════════════════════════════════════════════════════ */
export function LoanDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: loan, loading, error } = useAsync(() => api.loan(slug), [slug]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => navigate('/loans', { replace: true }), 2600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [error, navigate]);

  if (loading) return <Spinner label="Loading loan guide" className="pt-40" />;

  if (error || !loan) {
    return (
      <div className="shell pt-40">
        <EmptyState
          title="That loan guide is not available"
          description={error || 'It may have been renamed or removed.'}
          action={
            <Link to="/loans" className="btn-ghost mt-2">
              Back to loan types
            </Link>
          }
        />
      </div>
    );
  }

  const accent = loan.accent || '#5B8CFF';

  const blocks = [
    { label: 'What it is', value: loan.whatItIs, icon: Wallet },
    { label: 'Commonly used for', value: loan.commonPurpose, icon: Sparkles },
    { label: 'How interest works', value: loan.interestConcept, icon: Percent },
    { label: 'About tenure', value: loan.tenureConcept, icon: CalendarClock },
    { label: 'How it is repaid', value: loan.repaymentConcept, icon: Check },
  ].filter((block) => block.value);

  return (
    <PageTransition>
      {/* Hero */}
      <div
        className="relative overflow-hidden border-b border-tint/[0.06] pb-14 pt-[calc(var(--nav-h)+3rem)]"
        style={{ background: `radial-gradient(80rem 30rem at 50% -10%, ${accent}14, transparent 70%)` }}
      >
        <div className="shell">
          <Link to="/loans" className="btn-ghost btn-sm">
            <ArrowLeft size={13} />
            All loan types
          </Link>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <span
              className="grid h-14 w-14 place-items-center rounded-2xl text-2xl"
              style={{
                background: `${accent}1A`,
                boxShadow: `inset 0 0 0 1px ${accent}33`,
              }}
              aria-hidden="true"
            >
              {loan.icon || '₹'}
            </span>
            <div>
              <h1 className="text-3xl font-semibold sm:text-4xl">{loan.name}</h1>
              <p className="mt-1 text-sm text-mist-400">{loan.tagline}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="shell grid gap-10 py-14 lg:grid-cols-[1fr_320px]">
        {/* Main content */}
        <div>
          <div className="grid gap-4">
            {blocks.map((block, index) => (
              <ScrollReveal key={block.label} delay={index * 0.05}>
                <section className="glass glass-edge p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-50">
                    <block.icon size={15} style={{ color: accent }} strokeWidth={1.9} />
                    {block.label}
                  </h2>
                  <p className="mt-2.5 text-[0.875rem] leading-relaxed text-mist-300">
                    {block.value}
                  </p>
                </section>
              </ScrollReveal>
            ))}
          </div>

          {/* Pros / cons */}
          {(loan.pros?.length > 0 || loan.cons?.length > 0) && (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {loan.pros?.length > 0 && (
                <section className="glass glass-edge p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-positive">
                    <Check size={15} />
                    Strengths
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {loan.pros.map((pro) => (
                      <li key={pro} className="flex gap-2 text-[0.8125rem] leading-relaxed text-mist-300">
                        <Check size={13} className="mt-0.5 shrink-0 text-positive/70" />
                        {pro}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {loan.cons?.length > 0 && (
                <section className="glass glass-edge p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-caution">
                    <X size={15} />
                    Things to weigh
                  </h2>
                  <ul className="mt-3 space-y-2">
                    {loan.cons.map((con) => (
                      <li key={con} className="flex gap-2 text-[0.8125rem] leading-relaxed text-mist-300">
                        <X size={13} className="mt-0.5 shrink-0 text-caution/70" />
                        {con}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {/* Key terminology */}
          {loan.keyTerminology?.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-semibold">Key terminology</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {loan.keyTerminology.map((entry, index) => (
                  <ScrollReveal key={entry.id ?? index} delay={Math.min(index, 5) * 0.04}>
                    <LoanTermCard
                      term={{ ...entry, shortDefinition: entry.shortDefinition || entry.short_definition }}
                      index={index}
                    />
                  </ScrollReveal>
                ))}
              </div>
            </section>
          )}

          {/* Documents */}
          {loan.documents?.length > 0 && (
            <section className="mt-10">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <FileText size={17} style={{ color: accent }} />
                Documents usually needed
              </h2>
              <div className="mt-4">
                <DocumentList documents={loan.documents} />
              </div>
            </section>
          )}

          {/* Eligibility factors */}
          {loan.eligibilityFactors?.length > 0 && (
            <section className="mt-10">
              <h2 className="text-lg font-semibold">Eligibility factors for this loan</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {loan.eligibilityFactors.map((factor) => (
                  <div key={factor.id} className="glass glass-edge p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-mist-50">{factor.factor}</p>
                      <Badge
                        tone={
                          factor.impact === 'high'
                            ? 'negative'
                            : factor.impact === 'medium'
                              ? 'caution'
                              : 'positive'
                        }
                      >
                        {factor.impact}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-mist-400">{factor.summary}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-[calc(var(--nav-h)+1.5rem)] lg:self-start">
          <div className="glass glass-edge p-5">
            <p className="text-2xs font-semibold uppercase tracking-wide3 text-mist-500">
              Try the numbers
            </p>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-mist-300">
              Work out what a {loan.name.toLowerCase()} would actually cost per month.
            </p>
            <Link to="/calculator" className="btn-gold mt-4 w-full">
              Open EMI calculator
            </Link>
          </div>

          {loan.eligibilitySummary && (
            <div className="glass glass-edge p-5">
              <p className="text-2xs font-semibold uppercase tracking-wide3 text-mist-500">
                Eligibility snapshot
              </p>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-mist-300">
                {loan.eligibilitySummary}
              </p>
              <Link
                to="/eligibility"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 hover:text-brand-200"
              >
                All eligibility factors
                <ArrowRight size={12} />
              </Link>
            </div>
          )}

          <Disclaimer variant="full" />
        </aside>
      </div>
    </PageTransition>
  );
}

export default LoansPage;
