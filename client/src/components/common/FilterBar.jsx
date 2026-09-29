import { Search, X } from 'lucide-react';

/**
 * Search + category filter used by every knowledge list page.
 * Fully controlled so pages own their query state and can debounce fetching.
 */
export default function FilterBar({
  search,
  onSearchChange,
  category,
  onCategoryChange,
  categories = [],
  placeholder = 'Search…',
  allLabel = 'All',
  resultLabel,
  children,
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search
          size={15}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mist-500"
          strokeWidth={2}
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="field pl-10 pr-9"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-mist-500 transition-colors hover:text-mist-200"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {categories.length > 0 && (
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:mx-0 sm:px-0">
          <button
            type="button"
            onClick={() => onCategoryChange('all')}
            className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
              category === 'all'
                ? 'border-brand-400/40 bg-brand-400/12 text-brand-200'
                : 'border-tint/10 text-mist-400 hover:border-tint/20 hover:text-mist-100'
            }`}
          >
            {allLabel}
          </button>
          {categories.map((item) => {
            const value = item.category ?? item.value;
            const name = item.category ?? item.label;
            const count = item.count;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onCategoryChange(value)}
                className={`whitespace-nowrap rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                  category === value
                    ? 'border-brand-400/40 bg-brand-400/12 text-brand-200'
                    : 'border-tint/10 text-mist-400 hover:border-tint/20 hover:text-mist-100'
                }`}
              >
                {name}
                {count !== undefined && <span className="ml-1.5 text-mist-600 tnum">{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {resultLabel && <div className="text-xs text-mist-500 sm:ml-1">{resultLabel}</div>}
      {children}
    </div>
  );
}
