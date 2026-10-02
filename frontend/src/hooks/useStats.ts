// hooks/useStats.ts
import { useState, useEffect } from 'react';
import { fetchStats } from '../services/api';
import type { PopulationStats } from '../types';

export function useStats() {
  const [data, setData]       = useState<PopulationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchStats()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
