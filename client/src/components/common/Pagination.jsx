import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Server-paginated pager. */
export default function Pagination({ page, totalPages, total, onChange, label = 'results' }) {
  if (!totalPages || totalPages < 2) return null;

  const pages = [];
  const push = (value) => pages.push(value);
  const start = Math.max(1, Math.min(page - 1, totalPages - 2));
  const end = Math.min(totalPages, Math.max(page + 1, 3));

  if (start > 1) {
    push(1);
    if (start > 2) push('…');
  }
  for (let i = start; i <= end; i += 1) push(i);
  if (end < totalPages) {
    if (end < totalPages - 1) push('…');
    push(totalPages);
  }

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-4 pt-8"
      aria-label="Pagination"
    >
      <p className="text-xs text-mist-500 tnum">
        Page <span className="text-mist-300">{page}</span> of {totalPages} · {total} {label}
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={14} />
          Prev
        </button>

        <div className="flex items-center gap-1">
          {pages.map((item, index) =>
            item === '…' ? (
              <span key={`gap-${index}`} className="px-1.5 text-mist-500">
                …
              </span>
            ) : (
              <button
                key={item}
                type="button"
                onClick={() => onChange(item)}
                aria-current={item === page ? 'page' : undefined}
                className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold tnum transition-colors ${
                  item === page
                    ? 'bg-brand-400/15 text-brand-200 ring-1 ring-inset ring-brand-400/40'
                    : 'text-mist-400 hover:bg-tint/[0.05] hover:text-mist-100'
                }`}
              >
                {item}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </nav>
  );
}
