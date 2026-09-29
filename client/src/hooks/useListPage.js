/**
 * Shared list-page state machine.
 *
 * The glossary, documents, eligibility and FAQ pages are all "fetch a
 * filtered, paginated list from the API". Rather than repeat the same search /
 * debounce / pagination / error handling four times, they share this hook.
 *
 * The search term is debounced so typing does not fire a request per keystroke.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function useListPage(fetcher, { initialLimit = 12, extraParams } = {}) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [meta, setMeta] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: initialLimit,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Keep the latest extraParams without making it a fetch dependency.
  const extraRef = useRef(extraParams);
  extraRef.current = extraParams;

  /* ── Debounce the search box ─────────────────────────────────────── */
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 280);
    return () => clearTimeout(id);
  }, [search]);

  /* ── Categories are static, fetched once ────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(fetcher.categories?.())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setCategories(data);
      })
      .catch(() => {
        /* filters degrade to "all" */
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  /* ── Fetch the list ──────────────────────────────────────────────── */
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = (requestId.current += 1);
    setLoading(true);
    setError(null);

    try {
      const response = await fetcher.list({
        search: debouncedSearch || undefined,
        category: category === 'all' ? undefined : category,
        page,
        limit: initialLimit,
        ...(extraRef.current || {}),
      });

      // Ignore a slow response that a newer request has already superseded.
      if (id !== requestId.current) return;

      const data = response?.data !== undefined ? response.data : response;
      setItems(Array.isArray(data) ? data : []);
      setPagination(response?.pagination || {
        page,
        limit: initialLimit,
        total: Array.isArray(data) ? data.length : 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: page > 1,
      });
      setMeta(response?.meta || null);
    } catch (err) {
      if (id !== requestId.current) return;
      setItems([]);
      setError(err.message || 'Could not load this list.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [fetcher, debouncedSearch, category, page, initialLimit]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh the category facets after a fetch (counts may change).
  useEffect(() => {
    if (Array.isArray(meta?.categories) && meta.categories.length) {
      setCategories(meta.categories);
    }
  }, [meta]);

  const clearFilters = useCallback(() => {
    setSearch('');
    setCategory('all');
    setPage(1);
  }, []);

  return useMemo(
    () => ({
      items,
      categories,
      meta,
      pagination,
      search,
      setSearch,
      category,
      setCategory,
      page,
      setPage,
      loading,
      error,
      reload: load,
      clearFilters,
      isFiltered: Boolean(search) || category !== 'all',
    }),
    [
      items, categories, meta, pagination, search, category, page,
      loading, error, load, clearFilters,
    ],
  );
}

export default useListPage;
