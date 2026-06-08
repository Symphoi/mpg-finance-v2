'use client';
import { useState, useEffect, useCallback } from 'react';

export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

interface UseApiOptions {
  immediate?: boolean;
}

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(url: string | null, options: UseApiOptions = { immediate: true }) {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: !!url, error: null });

  const fetch_ = useCallback(async (fetchUrl: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res  = await fetch(fetchUrl, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Request failed');
      setState({ data: json.data ?? json, loading: false, error: null });
      return json.data ?? json;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setState({ data: null, loading: false, error: message });
      throw err;
    }
  }, []);

  useEffect(() => {
    if (url && options.immediate !== false) {
      fetch_(url);
    }
  }, [url, fetch_, options.immediate]);

  const refetch = useCallback(() => {
    if (url) return fetch_(url);
  }, [url, fetch_]);

  return { ...state, refetch };
}

export function usePaginated<T>(baseUrl: string, initialParams: Record<string, string> = {}) {
  const [params, setParams] = useState({ page: '1', limit: '20', ...initialParams });
  const [data, setData]     = useState<T[]>([]);
  const [meta, setMeta]     = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const load = useCallback(async (overrideParams?: Record<string, string>) => {
    const merged = { ...params, ...(overrideParams ?? {}) };
    const qs = new URLSearchParams(Object.entries(merged).filter(([, v]) => v));
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`${baseUrl}?${qs}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      setData(json.data ?? []);
      setMeta(json.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [baseUrl, JSON.stringify(params)]);

  useEffect(() => { load(); }, [baseUrl, JSON.stringify(params)]);

  const setParam  = (key: string, value: string) => setParams((p) => ({ ...p, [key]: value, page: '1' }));
  const setPage   = (page: number)   => setParams((p) => ({ ...p, page: String(page) }));
  const setLimit  = (limit: number)  => setParams((p) => ({ ...p, limit: String(limit), page: '1' }));
  const setSearch = (search: string) => setParam('search', search);
  const setStatus = (status: string) => setParam('status', status);

  return { data, meta, loading, error, refetch: load, setParam, setPage, setLimit, setSearch, setStatus, params };
}