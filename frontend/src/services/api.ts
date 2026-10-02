// services/api.ts
// Typed API client for all Upay Campaign Intelligence endpoints

import type {
  PopulationStats,
  CustomerListResponse,
  CustomerDetail,
  CustomerQueryParams,
  CampaignConfig,
  CampaignResult,
} from '../types';

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '') + '/api';

// ── Generic fetch wrapper ─────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body?.error || `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ── API methods ───────────────────────────────────────────────────────────────

/** GET /api/stats — Population-level statistics */
export async function fetchStats(): Promise<PopulationStats> {
  return apiFetch<PopulationStats>('/stats');
}

/** GET /api/customers — Paginated customer list */
export async function fetchCustomers(params: CustomerQueryParams = {}): Promise<CustomerListResponse> {
  const qs = new URLSearchParams();
  if (params.page)          qs.set('page',          String(params.page));
  if (params.limit)         qs.set('limit',         String(params.limit));
  if (params.segment)       qs.set('segment',       params.segment);
  if (params.fatigue)       qs.set('fatigue',       params.fatigue);
  if (params.sort)          qs.set('sort',          params.sort);
  if (params.order)         qs.set('order',         params.order);
  if (params.campaign_type) qs.set('campaign_type', params.campaign_type);

  const query = qs.toString() ? `?${qs}` : '';
  return apiFetch<CustomerListResponse>(`/customers${query}`);
}

/** GET /api/customers/:id — Full customer profile */
export async function fetchCustomer(id: string): Promise<CustomerDetail> {
  return apiFetch<CustomerDetail>(`/customers/${encodeURIComponent(id)}`);
}

/** POST /api/campaign/run — Run campaign intelligence pipeline */
export async function runCampaign(config: CampaignConfig): Promise<CampaignResult> {
  return apiFetch<CampaignResult>('/campaign/run', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}
