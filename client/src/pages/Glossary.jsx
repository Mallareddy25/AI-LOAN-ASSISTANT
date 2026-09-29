/**
 * Glossary (terminology) list + term detail.
 */
import { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Lightbulb } from 'lucide-react';

import { api } from '../services/api';
import useListPage from '../hooks/useListPage';
import useAsync from '../hooks/useAsync';
import PageTransition from '../components/animations/PageTransition';
import ScrollReveal from '../components/animations/ScrollReveal';
import { LoanTermCard } from '../components/finance';
import FilterBar from '../components/common/FilterBar';
import Pagination from '../components/common/Pagination';
import EmptyState from '../components/common/EmptyState';
import Spinner from '../components/common/Spinner';
import Skeleton from '../components/common/Skeleton';
import SectionHeading from '../components/common/SectionHeading';
import Badge from '../components/common/Badge';

const fetcher = { list: api.terms, categories: api.termCategories };

/* ══ List ═════════════════════════════════════════════════════════════ */
export function GlossaryPage() {
  const list = useListPage(fetcher, { initialLimit: 12 });

  return (
    <PageTransition>
      <div className="shell pb-16 pt-[calc(var(--nav-h)+3rem)]">
        <SectionHeading
          eyebrow="Terminology"
          title="The language of lending"
          lede="Every term explained in plain language, with the numbers attached. Search for anything you have heard but never understood."
        />

        <div className="mt-9">
          <FilterBar
            search={list.search}
            onSearchChange={list.setSearch}
            category={list.category}
            onCategoryChange={list.setCategory}
            categories={list.categories}
            placeholder="Search terms…"
            allLabel="All categories"
            resultLabel={
              !list.loading && list.pagination?.total
                ? `${list.pagination.total} terms`
                : undefined
            }
          />
        </div>

        {list.loading ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-44" />
            ))}
          </div>
        ) : list.error ? (
          <EmptyState title="Could not load the glossary" description={list.error} />
        ) : list.items.length === 0 ? (
          <EmptyState
            title="No terms match that search"
            description="Try a different word, or clear the filters to see the whole glossary."
            action={
              <button type="button" className="btn-ghost btn-sm mt-2" onClick={list.clearFilters}>
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.items.map((term, index) => (
              <ScrollReveal key={term.id} delay={Math.min(index, 7) * 0.04}>
                <LoanTermCard term={term} index={index} />
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
            label="terms"
          />
        )}
      </div>
    </PageTransition>
  );
}

/* ══ Detail ════════════════════════════════════════════════════════════ */
export function TermDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { data: term, loading, error } = useAsync(() => api.term(slug), [slug]);

  const related = useMemo(() => {
    if (!term) return [];
    return (term.relatedTerms || []).map((entry) =>
      typeof entry === 'string' ? { term: entry, shortDefinition: null } : entry,
    );
  }, [term]);

  if (loading) return <Spinner label="Loading term" className="pt-40" />;

  if (error || !term) {
    return (
      <div className="shell pt-40">
        <EmptyState
          title="That term is not in the glossary"
          description={error || 'It may have been renamed or removed.'}
          action={
            <Link to="/glossary" className="btn-ghost mt-2">
              Back to glossary
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="shell max-w-3xl pb-16 pt-[calc(var(--nav-h)+3rem)]">
        <Link to="/glossary" className="btn-ghost btn-sm">
          <ArrowLeft size={13} />
          Glossary
        </Link>

        <header className="mt-8">
          <span className="eyebrow">
            <span className="coin grid h-4 w-4 place-items-center rounded-full text-[0.5rem] font-bold text-ink-950">
              ₹
            </span>
            {term.category}
          </span>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{term.term}</h1>
          {term.shortDefinition && (
            <p className="lede mt-4 text-lg">{term.shortDefinition}</p>
          )}
        </header>

        {term.detailedExplanation && (
          <section className="glass glass-edge mt-8 p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-mist-50">
              <BookOpen size={15} className="text-gold-300" />
              In detail
            </h2>
            <p className="mt-3 whitespace-pre-line text-[0.9375rem] leading-relaxed text-mist-200">
              {term.detailedExplanation}
            </p>
          </section>
        )}

        {term.example && (
          <section className="mt-4 rounded-2xl border border-gold-400/20 bg-gold-400/[0.05] p-6">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gold-200">
              <Lightbulb size={15} />
              Example
            </h2>
            <p className="mt-2.5 text-[0.875rem] leading-relaxed text-mist-200">{term.example}</p>
          </section>
        )}

        {term.whyItMatters && (
          <section className="mt-4 rounded-2xl border border-tint/[0.08] bg-tint/[0.02] p-6">
            <h2 className="text-sm font-semibold text-mist-50">Why it matters</h2>
            <p className="mt-2.5 text-[0.875rem] leading-relaxed text-mist-300">
              {term.whyItMatters}
            </p>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-base font-semibold">Related concepts</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {related.map((entry, index) => (
                <Link
                  key={entry.slug || entry.term || index}
                  to={entry.slug ? `/glossary/${entry.slug}` : '/glossary'}
                  className="rounded-xl border border-tint/10 bg-tint/[0.03] px-3.5 py-2 text-[0.8125rem] text-mist-200 transition-colors hover:border-gold-400/30 hover:text-gold-200"
                >
                  {entry.term}
                  {entry.shortDefinition && (
                    <span className="ml-2 text-mist-500">{entry.shortDefinition}</span>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/chat" className="btn-gold">
            Ask about this
            <ArrowRight size={14} />
          </Link>
          <button type="button" className="btn-ghost" onClick={() => navigate('/calculator')}>
            Open EMI calculator
          </button>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <Badge tone="neutral">Category: {term.category}</Badge>
        </div>
      </div>
    </PageTransition>
  );
}

export default GlossaryPage;
