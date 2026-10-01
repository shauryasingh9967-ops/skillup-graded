import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeError } from '../api/client';

// Runs an async function whenever deps change. Returns { data, loading, error, reload }.
export default function useAsync(fn, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const seq = useRef(0);

  const run = useCallback(async () => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (id === seq.current) setState({ data, loading: false, error: null });
    } catch (err) {
      if (id === seq.current) setState((s) => ({ data: s.data, loading: false, error: normalizeError(err) }));
    }
  }, []);

  useEffect(() => {
    if (enabled) run();
    else setState({ data: null, loading: false, error: null });
    return () => { seq.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return { ...state, reload: run };
}
