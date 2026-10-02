// hooks/useCampaignRun.ts
import { useState } from 'react';
import { runCampaign } from '../services/api';
import type { CampaignConfig, CampaignResult } from '../types';

export function useCampaignRun() {
  const [data, setData]       = useState<CampaignResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function execute(config: CampaignConfig) {
    setLoading(true);
    setError(null);
    try {
      const result = await runCampaign(config);
      setData(result);
      return result;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setData(null);
    setError(null);
  }

  return { data, loading, error, execute, reset };
}
