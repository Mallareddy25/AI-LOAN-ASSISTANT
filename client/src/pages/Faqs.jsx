/**
 * FAQ list with an inline expanding answer.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, HelpCircle } from 'lucide-react';

import { api } from '../services/api';
import useListPage from '../hooks/useListPage';
import PageTransition from '../components/animations/PageTransition';
import ScrollReveal from '../components/animations/ScrollReveal';
import FaqAccordion from '../components/common/FaqAccordion';
import FilterBar from '../components/common/FilterBar';
import Pagination from '../components/common/Pagination';
import EmptyState from '../components/common/EmptyState';
import Skeleton from '../components/common/Skeleton';
import SectionHeading from '../components/common/SectionHeading';
import Disclaimer from '../components/common/Disclaimer';

const fetcher = { list: api.faqs, categories: api.faqCategories };

export default function FaqsPage() {
  const list = useListPage(fetcher, { initialLimit: 15 });

  const grouped = useMemo(() => {
    const map = new Map();
    list.items.forEach((faq) => {
      if (!map.has(faq.category)) map.set(faq.category, []);
      map.get(faq.category).push(faq);
    });
    return [...map.entries()];
  }, [list.items]);

  return (
    <PageTransition>
      <div className="shell pb-16 pt-[calc(var(--nav-h)+3rem)]">
        <SectionHeading
          eyebrow="FAQs"
          title="The questions people actually ask"
          lede="Grouped by topic. If your question is not here, the assistant can answer it from the same knowledge base — or you can ask it something the FAQs do not cover."
        />

        <div className="mt-9">
          <FilterBar
            search={list.search}
            onSearchChange={list.setSearch}
            category={list.category}
            onCategoryChange={list.setCategory}
            categories={list.categories}
            placeholder="Search questions…"
            allLabel="All topics"
            resultLabel={
              !list.loading && list.pagination?.total
                ? `${list.pagination.total} questions`
                : undefined
            }
          />
        </div>

        {list.loading ? (
          <div className="mt-8 space-y-3">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-16" />
            ))}
          </div>
        ) : list.error ? (
          <EmptyState title="Could not load the FAQs" description={list.error} icon={HelpCircle} />
        ) : list.items.length === 0 ? (
          <EmptyState
            title="No questions match that search"
            description="Try another keyword, or clear the filters."
            action={
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <button type="button" className="btn-ghost btn-sm" onClick={list.clearFilters}>
                  Clear filters
                </button>
                <Link to="/chat" className="btn-gold btn-sm">
                  Ask the assistant
                </Link>
              </div>
            }
          />
        ) : (
          <div className="mt-8 space-y-10">
            {grouped.map(([category, faqs], groupIndex) => (
              <section key={category}>
                <h2 className="mb-3 text-sm font-semibold text-mist-50">{category}</h2>
                <div className="space-y-2.5">
                  {faqs.map((faq, index) => (
                    <ScrollReveal key={faq.id} delay={Math.min(index + groupIndex, 5) * 0.04}>
                      <FaqAccordion faq={faq} />
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
            label="questions"
          />
        )}

        <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl border border-tint/[0.08] bg-tint/[0.02] p-6 sm:flex-row sm:items-center">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-gold-400/25 bg-gold-400/[0.08] text-gold-300"
            aria-hidden="true"
          >
            <MessageCircle size={18} />
          </span>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-mist-50">Still not answered?</h3>
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-mist-400">
              Ask a question in your own words. The assistant answers from the curated knowledge base
              and will say so when it does not have an answer.
            </p>
          </div>
          <Link to="/chat" className="btn-gold shrink-0">
            Open the assistant
          </Link>
        </div>

        <Disclaimer variant="full" className="mt-6" />
      </div>
    </PageTransition>
  );
}
