// hooks/useCustomers.ts
import { useState, useEffect, useCallback } from 'react';
import { fetchCustomers } from '../services/api';
import type { CustomerListResponse, CustomerQueryParams } from '../types';

export function useCustomers(initialParams: CustomerQueryParams = {}) {
  const [data, setData]       = useState<CustomerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [params, setParams]   = useState<CustomerQueryParams>({
    page: 1, limit: 50, sort: 'avg_monthly_gmv_bdt', order: 'desc',
    ...initialParams,
  });

  const load = useCallback(async (p: CustomerQueryParams) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCustomers(p);
      setData(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(params);
  }, [params, load]);

  function updateParams(updates: Partial<CustomerQueryParams>) {
    setParams(prev => ({ ...prev, ...updates, page: 1 }));
  }

  function setPage(page: number) {
    setParams(prev => ({ ...prev, page }));
  }

  return { data, loading, error, params, updateParams, setPage };
}
