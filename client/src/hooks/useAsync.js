/**
 * Minimal async data hook with cancellation and error capture.
 * Used by every page that loads a single resource.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export function useAsync(fetcher, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const requestId = useRef(0);

  const run = useCallback(async () => {
    const id = (requestId.current += 1);
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (id !== requestId.current) return;
      setData(result);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err.message || 'Something went wrong.');
      setData(null);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (immediate) run();
  }, [run, immediate]);

  return { data, loading, error, reload: run, setData };
}

export default useAsync;
