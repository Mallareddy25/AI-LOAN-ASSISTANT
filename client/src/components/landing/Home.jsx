/**
 * Homepage — the cinematic scroll story.
 *
 * SECTION 1  Money can be complicated.      floating coins + AI orb
 * SECTION 2  Let's understand the language.  coins → terminology cards
 * SECTION 3  Eligibility depends on factors.  factors → network
 * SECTION 4  Documents make it clearer.      3D document stack
 * SECTION 5  Understand how repayment works. 3D timeline
 * SECTION 6  See the numbers.               interactive EMI calculator
 * SECTION 7  Still have questions?          assistant CTA
 *
 * Data is fetched from the real API; the visuals never invent numbers.
 */
import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Calculator,
  FileText,
  ShieldCheck,
  MessageCircle,
  Wallet,
  TrendingUp,
  Clock,
} from 'lucide-react';

import { api, calculatorApi } from '../../services/api';
import { usePrefersReducedMotion } from '../../hooks';
import { registerSection } from '../../utils/scrollEngine';

/**
 * Ids of the story chapters, in order. The 3D layer and the scroll-linked
 * finance visuals both resolve their state from these, so every chapter
 * section must register itself with the shared engine — a plain `id`
 * attribute is not enough.
 */
const STORY_IDS = ['hero', 'terminology', 'eligibility', 'documents', 'repayment', 'calculator', 'cta'];

function useStorySections() {
  useEffect(() => {
    const cleanups = STORY_IDS.map((id) => {
      const element = document.getElementById(id);
      return element ? registerSection(id, element) : () => {};
    });
    return () => cleanups.forEach((fn) => fn());
  }, []);
}
import ScrollReveal from '../animations/ScrollReveal';
import ParallaxElement from '../animations/ParallaxElement';
import MagneticButton from '../animations/MagneticButton';
import { LoanTermCard, EMIVisualization, DocumentStack, DocumentList } from '../finance';
import { EligibilityVisualization, RepaymentTimeline } from '../finance';
import AIOrb from '../chatbot/AIOrb';
import Disclaimer from '../common/Disclaimer';
import Badge from '../common/Badge';
import Spinner from '../common/Spinner';

/* ══ Hero ══════════════════════════════════════════════════════════════ */
function Hero({ onAsk }) {
  const reduced = usePrefersReducedMotion();

  // Floating finance labels around the headline — DOM 3D, crisp text.
  const labels = useMemo(
    () => [
      { text: 'EMI', x: '8%', y: '22%', d: 0 },
      { text: 'PRINCIPAL', x: '82%', y: '18%', d: 0.6 },
      { text: 'INTEREST', x: '86%', y: '58%', d: 1.2 },
      { text: 'TENURE', x: '6%', y: '66%', d: 1.8 },
      { text: 'CREDIT', x: '46%', y: '8%', d: 2.4 },
      { text: 'BALANCE', x: '40%', y: '84%', d: 3 },
    ],
    [],
  );

  return (
    <section
      id="hero"
      data-story="hero"
      className="relative flex min-h-[100svh] items-center overflow-hidden pb-20 pt-[calc(var(--nav-h)+3rem)]"
    >
      <div className="shell relative">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          {/* ── Copy ── */}
          <div className="relative">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="eyebrow">
                <Sparkles size={11} strokeWidth={2.4} className="text-gold-300" />
                AI-powered financial education
              </span>
            </motion.div>

            <h1 className="mt-6 text-[2.75rem] font-bold leading-[1.02] tracking-tightest sm:text-6xl lg:text-[4.25rem]">
              <motion.span
                className="block"
                initial={reduced ? false : { opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
              >
                Understand Loans.
              </motion.span>
              <motion.span
                className="block text-gradient-gold"
                initial={reduced ? false : { opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.75, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              >
                Understand Your Money.
              </motion.span>
            </h1>

            <motion.p
              className="lede mt-6 max-w-xl text-lg"
              initial={reduced ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
            >
              Your AI-powered assistant for loans, eligibility, documents and repayment.
            </motion.p>

            <motion.div
              className="mt-9 flex flex-wrap items-center gap-3"
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.36, ease: [0.22, 1, 0.36, 1] }}
            >
              <MagneticButton className="btn-gold" onClick={onAsk}>
                Ask the AI Loan Assistant
                <ArrowRight size={15} />
              </MagneticButton>
              <Link to="/calculator" className="btn-ghost">
                <Calculator size={15} />
                Open EMI calculator
              </Link>
            </motion.div>

            <motion.div
              className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-mist-500"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-positive" />
                Never asks for OTP or credentials
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileText size={13} className="text-gold-300" />
                Grounded in a curated knowledge base
              </span>
            </motion.div>
          </div>

          {/* ── Orb + floating labels ── */}
          <div className="relative hidden aspect-square lg:block">
            <div className="absolute inset-0 grid place-items-center">
              <AIOrb size={230} />
            </div>

            {/* Orbiting financial labels */}
            {!reduced &&
              labels.map((label) => (
                <span
                  key={label.text}
                  className="glass absolute whitespace-nowrap px-2.5 py-1 text-2xs font-bold uppercase tracking-wide2 text-mist-300"
                  style={{
                    left: label.x,
                    top: label.y,
                    animation: `float-slow ${5 + label.d}s ${label.d}s ease-in-out infinite`,
                  }}
                >
                  {label.text}
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <motion.div
        className="absolute inset-x-0 bottom-7 flex justify-center"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.6 }}
      >
        <span className="flex flex-col items-center gap-2 text-2xs uppercase tracking-wide3 text-mist-600">
          Scroll
          <span className="relative block h-8 w-px overflow-hidden bg-tint/10">
            <motion.span
              className="absolute inset-x-0 top-0 block h-3 bg-gold-300/70"
              animate={reduced ? {} : { y: [0, 20, 0] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
            />
          </span>
        </span>
      </motion.div>
    </section>
  );
}

/* ══ Section 2 — terminology ═══════════════════════════════════════════ */
function TerminologySection({ terms, loading }) {
  return (
    <section
      id="terminology"
      data-story="terminology"
      className="section relative"
      style={{ ['--section']: 'terminology' }}
    >
      <div className="shell">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <ScrollReveal>
              <span className="eyebrow">
                <span className="text-gold-300">02</span>
                The language
              </span>
              <h2 className="mt-5 text-3xl font-semibold sm:text-4xl">
                Let&rsquo;s understand the
                <br />
                language of loans.
              </h2>
            </ScrollReveal>
          </div>
          <ParallaxElement distance={-26} className="lg:pb-2">
            <ScrollReveal delay={0.1}>
              <p className="lede max-w-xl lg:ml-auto">
                Every loan conversation is built from a handful of words. Learn what they actually
                mean — in plain language, with the numbers attached.
              </p>
            </ScrollReveal>
          </ParallaxElement>
        </div>

        <div className="mt-12">
          {loading ? (
            <Spinner label="Loading terminology" />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {terms.map((term, index) => (
                  <ScrollReveal key={term.id} delay={Math.min(index, 5) * 0.06}>
                    <LoanTermCard term={term} index={index} />
                  </ScrollReveal>
                ))}
              </div>

              <div className="mt-10">
                <Link to="/glossary" className="btn-ghost">
                  Browse all {terms.length > 0 ? '26 ' : ''}terms
                  <ArrowRight size={14} />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* ══ Section 3 — eligibility ══════════════════════════════════════════ */
function EligibilitySection({ impactCounts, loading }) {
  return (
    <section id="eligibility" data-story="eligibility" className="section relative">
      <div className="shell">
        <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <ScrollReveal>
              <span className="eyebrow">
                <span className="text-gold-300">03</span>
                Eligibility
              </span>
              <h2 className="mt-5 text-3xl font-semibold sm:text-4xl">
                Eligibility depends on
                <br />
                multiple factors.
              </h2>
              <p className="lede mt-5 max-w-lg">
                There is no single pass-or-fail test. Lenders weigh your income, credit history,
                existing obligations and employment type together — which is why two people with the
                same loan amount can get very different outcomes.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.12}>
              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Income', icon: Wallet, accent: '#C9A227' },
                  { label: 'Credit history', icon: TrendingUp, accent: '#A78BFA' },
                  { label: 'Existing debt', icon: Clock, accent: '#E0A93B' },
                  { label: 'Employment', icon: ShieldCheck, accent: '#5B8CFF' },
                ].map((item) => (
                  <div key={item.label} className="glass glass-edge px-3.5 py-3">
                    <item.icon size={15} style={{ color: item.accent }} strokeWidth={1.8} />
                    <p className="mt-2 text-xs font-semibold text-mist-200">{item.label}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <Link to="/eligibility" className="btn-ghost mt-7">
                Explore eligibility factors
                <ArrowRight size={14} />
              </Link>
            </ScrollReveal>
          </div>

          <ParallaxElement distance={34}>
            {loading ? (
              <Spinner label="Loading factors" />
            ) : (
              <EligibilityVisualization impactCounts={impactCounts} />
            )}
          </ParallaxElement>
        </div>
      </div>
    </section>
  );
}

/* ══ Section 4 — documents ════════════════════════════════════════════ */
function DocumentsSection({ documents, loading }) {
  const required = useMemo(
    () => documents.filter((doc) => doc.whyNeeded).slice(0, 5),
    [documents],
  );

  return (
    <section id="documents" data-story="documents" className="section relative">
      <div className="shell">
        <div className="max-w-2xl">
          <ScrollReveal>
            <span className="eyebrow">
              <span className="text-gold-300">04</span>
              Documents
            </span>
            <h2 className="mt-5 text-3xl font-semibold sm:text-4xl">
              Documents make the
              <br />
              process clearer.
            </h2>
            <p className="lede mt-5">
              The same handful of proofs comes up again and again. Knowing them in advance means you
              can collect everything once instead of three times.
            </p>
          </ScrollReveal>
        </div>

        {loading ? (
          <Spinner label="Loading documents" className="mt-12" />
        ) : (
          <>
            <div className="mt-10">
              <DocumentStack documents={required} max={5} />
            </div>

            <div className="mt-4">
              <DocumentList documents={required} />
            </div>

            <Link to="/documents" className="btn-ghost mt-8">
              Open the full checklist
              <ArrowRight size={14} />
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

/* ══ Section 5 — repayment ════════════════════════════════════════════ */
function RepaymentSection() {
  return (
    <section id="repayment" data-story="repayment" className="section relative">
      <div className="shell">
        <div className="max-w-2xl">
          <ScrollReveal>
            <span className="eyebrow">
              <span className="text-gold-300">05</span>
              Repayment
            </span>
            <h2 className="mt-5 text-3xl font-semibold sm:text-4xl">
              Understand how
              <br />
              repayment works.
            </h2>
            <p className="lede mt-5">
              A loan is a schedule, not a single number. Here is the whole life of one — from the
              day the money reaches you to the day the balance hits zero.
            </p>
          </ScrollReveal>
        </div>

        <ScrollReveal delay={0.1} className="mt-12">
          <RepaymentTimeline />
        </ScrollReveal>

        <Link to="/repayment" className="btn-ghost mt-8">
          See the full repayment guide
          <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}

/* ══ Section 6 — EMI calculator ═══════════════════════════════════════ */
function CalculatorSection() {
  const [form, setForm] = useState({ principal: 500000, annualRate: 12, tenureYears: 3 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const compute = async (next) => {
    setBusy(true);
    setError(null);
    try {
      const data = await calculatorApi.emi(next);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    compute(form);
    // Only on mount; subsequent changes go through the slider handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key, value) => {
    const next = { ...form, [key]: value };
    setForm(next);
    compute(next);
  };

  return (
    <section id="calculator" data-story="calculator" className="section relative">
      <div className="shell">
        <div className="max-w-2xl">
          <ScrollReveal>
            <span className="eyebrow">
              <span className="text-gold-300">06</span>
              The numbers
            </span>
            <h2 className="mt-5 text-3xl font-semibold sm:text-4xl">See the numbers.</h2>
            <p className="lede mt-5">
              Change any input and the visualisation responds. Every figure below is computed by the
              same formula a lender uses — nothing here is approximate.
            </p>
          </ScrollReveal>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Inputs */}
          <ScrollReveal className="h-full">
            <div className="glass glass-edge flex h-full flex-col gap-6 p-6">
              <div>
                <label htmlFor="hero-amount" className="label">
                  Loan amount — ₹{Number(form.principal).toLocaleString('en-IN')}
                </label>
                <input
                  id="hero-amount"
                  type="range"
                  min={50000}
                  max={5000000}
                  step={10000}
                  value={form.principal}
                  onChange={(event) => update('principal', Number(event.target.value))}
                  className="w-full accent-gold-400"
                />
              </div>

              <div>
                <label htmlFor="hero-rate" className="label">
                  Interest rate — {form.annualRate}% p.a.
                </label>
                <input
                  id="hero-rate"
                  type="range"
                  min={0}
                  max={30}
                  step={0.5}
                  value={form.annualRate}
                  onChange={(event) => update('annualRate', Number(event.target.value))}
                  className="w-full accent-gold-400"
                />
              </div>

              <div>
                <label htmlFor="hero-tenure" className="label">
                  Tenure — {form.tenureYears} years
                </label>
                <input
                  id="hero-tenure"
                  type="range"
                  min={1}
                  max={30}
                  step={1}
                  value={form.tenureYears}
                  onChange={(event) => update('tenureYears', Number(event.target.value))}
                  className="w-full accent-gold-400"
                />
              </div>

              {error && <p className="text-xs text-negative">{error}</p>}

              <Link to="/calculator" className="btn-ghost mt-auto w-full">
                Open full calculator
                <ArrowRight size={14} />
              </Link>
            </div>
          </ScrollReveal>

          {/* Visualisation */}
          <ScrollReveal delay={0.1} className="min-w-0">
            <div className={busy ? 'opacity-70 transition-opacity' : 'transition-opacity'}>
              <EMIVisualization result={result} />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}

/* ══ Section 7 — CTA ══════════════════════════════════════════════════ */
function CtaSection({ onAsk }) {
  return (
    <section id="cta" data-story="cta" className="section relative overflow-hidden">
      <div className="shell">
        <div className="glass glass-edge relative overflow-hidden px-6 py-14 text-center sm:px-12 sm:py-20">
          <div
            className="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-400/[0.09] blur-3xl"
            aria-hidden="true"
          />

          <div className="relative flex flex-col items-center">
            <ScrollReveal>
              <AIOrb size={120} />
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <h2 className="mt-7 text-3xl font-semibold sm:text-4xl">Still have questions?</h2>
              <p className="lede mx-auto mt-4 max-w-xl">
                Ask anything about loans, eligibility, documents or repayment. The assistant answers
                from a curated knowledge base and never asks for your OTP, PIN or password.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.18}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <MagneticButton className="btn-gold" onClick={onAsk}>
                  <MessageCircle size={15} />
                  Ask the AI Loan Assistant
                </MagneticButton>
                <Link to="/faqs" className="btn-ghost">
                  Read the FAQs
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                <Badge tone="positive">
                  <ShieldCheck size={10} />
                  No credential requests
                </Badge>
                <Badge tone="gold">
                  <FileText size={10} />
                  Educational content only
                </Badge>
              </div>

              <Disclaimer className="mx-auto mt-7 max-w-2xl justify-center text-center" />
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══ Page ═════════════════════════════════════════════════════════════ */
export default function Home({ onAsk }) {
  const [terms, setTerms] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [eligibilityMeta, setEligibilityMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useStorySections();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Parallel, independent, and each failure is non-fatal.
        const [termData, docData, eligData] = await Promise.allSettled([
          api.terms({ limit: 8 }),
          api.documents({ limit: 8 }),
          api.eligibility({ limit: 1 }),
        ]);

        if (cancelled) return;
        if (termData.status === 'fulfilled') setTerms(termData.value?.data || []);
        if (docData.status === 'fulfilled') setDocuments(docData.value?.data || []);
        // The eligibility endpoint returns impact metadata we can reuse.
        if (eligData.status === 'fulfilled') {
          setEligibilityMeta(eligData.value?.meta || null);
        }
      } catch {
        /* landing page degrades gracefully */
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Impact legend counts, derived from what we can see.
  const impactCounts = useMemo(() => {
    if (eligibilityMeta?.impacts) return eligibilityMeta.impacts;
    return null;
  }, [eligibilityMeta]);

  return (
    <>
      {/* Section 1 */}
      <Hero onAsk={onAsk} />
      {/* Section 2 */}
      <TerminologySection terms={terms} loading={loading} />
      {/* Section 3 */}
      <EligibilitySection impactCounts={impactCounts} loading={loading} />
      {/* Section 4 */}
      <DocumentsSection documents={documents} loading={loading} />
      {/* Section 5 */}
      <RepaymentSection />
      {/* Section 6 */}
      <CalculatorSection />
      {/* Section 7 */}
      <CtaSection onAsk={onAsk} />
    </>
  );
}

export { Hero, TerminologySection, EligibilitySection, DocumentsSection, RepaymentSection, CalculatorSection, CtaSection };
