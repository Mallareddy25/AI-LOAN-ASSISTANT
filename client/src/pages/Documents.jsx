/**
 * Document checklist.
 *
 * Groups results by category and keeps the "requirements vary by lender" note
 * visible, because that is the single most important caveat on this page.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Info, ChevronDown } from 'lucide-react';

import { api } from '../services/api';
import useListPage from '../hooks/useListPage';
import PageTransition from '../components/animations/PageTransition';
import ScrollReveal from '../components/animations/ScrollReveal';
import FilterBar from '../components/common/FilterBar';
import Pagination from '../components/common/Pagination';
import EmptyState from '../components/common/EmptyState';
import Skeleton from '../components/common/Skeleton';
import SectionHeading from '../components/common/SectionHeading';
import Disclaimer from '../components/common/Disclaimer';
import DocumentStack, { CATEGORY_ICON } from '../components/finance/DocumentStack';

const fetcher = { list: api.documents, categories: api.documentCategories };

function DocumentRow({ document: doc }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="glass glass-edge overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start gap-3.5 p-4 text-left transition-colors hover:bg-tint/[0.02]"
        aria-expanded={open}
      >
        <span
          className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-tint/10 bg-tint/[0.05] text-2xs font-bold text-gold-300"
          aria-hidden="true"
        >
          {CATEGORY_ICON[doc.category] || '•'}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-mist-50">{doc.title}</span>
            <span className="text-2xs font-semibold uppercase tracking-wide2 text-mist-500">
              {doc.category}
            </span>
          </span>
          <span className="mt-1 block text-[0.8125rem] leading-relaxed text-mist-400">
            {doc.description}
          </span>
        </span>

        <ChevronDown
          size={15}
          className={`mt-1 shrink-0 text-mist-500 transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-tint/[0.06] px-4 py-4">
          {doc.whyNeeded && (
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wide2 text-mist-500">
                Why it is needed
              </p>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-mist-300">
                {doc.whyNeeded}
              </p>
            </div>
          )}
          {doc.typicalFormats && (
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wide2 text-mist-500">
                Accepted formats
              </p>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-mist-300">
                {doc.typicalFormats}
              </p>
            </div>
          )}
          {doc.appliesTo && (
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wide2 text-mist-500">
                Usually needed for
              </p>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-mist-300">
                {doc.appliesTo}
              </p>
            </div>
          )}
          {doc.notes && (
            <p className="flex gap-2 rounded-lg border border-caution/20 bg-caution/[0.06] p-3 text-xs leading-relaxed text-mist-300">
              <Info size={13} className="mt-0.5 shrink-0 text-caution" />
              {doc.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  const list = useListPage(fetcher, { initialLimit: 12 });

  const grouped = useMemo(() => {
    const map = new Map();
    list.items.forEach((doc) => {
      if (!map.has(doc.category)) map.set(doc.category, []);
      map.get(doc.category).push(doc);
    });
    return [...map.entries()];
  }, [list.items]);

  return (
    <PageTransition>
      <div className="shell pb-16 pt-[calc(var(--nav-h)+3rem)]">
        <SectionHeading
          eyebrow="Documents"
          title="Everything lenders usually ask for"
          lede="The same proofs come up again and again. Collect them once, in digital form, and your application is far less likely to stall."
        />

        {list.items.length > 0 && (
          <div className="mt-10 hidden lg:block">
            <DocumentStack documents={list.items.filter((d) => d.whyNeeded)} max={6} />
          </div>
        )}

        <div className="mt-9">
          <FilterBar
            search={list.search}
            onSearchChange={list.setSearch}
            category={list.category}
            onCategoryChange={list.setCategory}
            categories={list.categories}
            placeholder="Search documents…"
            allLabel="All categories"
            resultLabel={
              !list.loading && list.pagination?.total
                ? `${list.pagination.total} documents`
                : undefined
            }
          />
        </div>

        {list.loading ? (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-20" />
            ))}
          </div>
        ) : list.error ? (
          <EmptyState title="Could not load documents" description={list.error} />
        ) : list.items.length === 0 ? (
          <EmptyState
            title="No documents match that search"
            description="Try another keyword, or clear the filters."
            action={
              <button type="button" className="btn-ghost btn-sm mt-2" onClick={list.clearFilters}>
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="mt-8 space-y-8">
            {grouped.map(([category, docs], groupIndex) => (
              <section key={category}>
                <div className="mb-3 flex items-center gap-2.5">
                  <h2 className="text-sm font-semibold text-mist-50">{category}</h2>
                  <span className="rounded-md bg-tint/[0.05] px-1.5 py-0.5 text-2xs tnum text-mist-500">
                    {docs.length}
                  </span>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {docs.map((doc, index) => (
                    <ScrollReveal key={doc.id} delay={Math.min(index + groupIndex, 6) * 0.04}>
                      <DocumentRow document={doc} />
                    </ScrollReveal>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {!list.loading && !list.error && (
          <Pagination
            page={list.pagination?.page || 1}
            totalPages={list.pagination?.totalPages || 1}
            total={list.pagination?.total || 0}
            onChange={list.setPage}
            label="documents"
          />
        )}

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <Disclaimer variant="full" text={list.meta?.note} />
          <div className="glass glass-edge flex items-start gap-3 p-5">
            <FileText size={16} className="mt-0.5 shrink-0 text-brand-300" />
            <p className="text-[0.8125rem] leading-relaxed text-mist-300">
              Not sure what a specific lender needs?{' '}
              <Link to="/chat" className="font-semibold text-brand-300 hover:text-brand-200">
                Ask the assistant
              </Link>{' '}
              for a general checklist, then confirm the exact list with the lender before you
              apply.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
