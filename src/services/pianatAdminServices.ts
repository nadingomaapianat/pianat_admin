/**
 * Typed client for the Pianat Admin portal (/api/pianat-admin/*).
 * Ported from the customer app; auditCsvUrl is replaced by downloadAuditCsv
 * because this app authenticates with a Bearer token (an <a href> can't carry it).
 */
import api, { getToken } from './apiClient';

// ── Catalog / templates ─────────────────────────────────────────────────

export interface ModuleCatalogEntry {
  module_key: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  available_for_archetypes: string[];
  requires_modules: string[] | null;
  is_premium: boolean;
  sort_order: number;
}

export interface TenantTemplate {
  id: string;
  name: string;
  description: string | null;
  archetype: string;
  enabled_modules: string[] | null;
  active_frameworks: string[] | null;
  enabled_ai_agents: string[] | null;
  usage_limits: Record<string, number> | null;
  default_subscription_plan: string | null;
  is_active: boolean;
}

export async function getModuleCatalog(archetype?: string): Promise<ModuleCatalogEntry[]> {
  const q = archetype ? `?archetype=${encodeURIComponent(archetype)}` : '';
  return api.get<ModuleCatalogEntry[]>(`/api/pianat-admin/module-catalog${q}`);
}

export async function getFrameworkCodes(): Promise<string[]> {
  return api.get<string[]>('/api/pianat-admin/frameworks');
}

export async function listTemplates(activeOnly = false): Promise<TenantTemplate[]> {
  const q = activeOnly ? '?active=1' : '';
  return api.get<TenantTemplate[]>(`/api/pianat-admin/tenant-templates${q}`);
}

export async function createTemplate(body: any): Promise<{ id: string; name: string }> {
  return api.post('/api/pianat-admin/tenant-templates', body);
}
export async function updateTemplate(id: string, body: any): Promise<any> {
  return api.put(`/api/pianat-admin/tenant-templates/${encodeURIComponent(id)}`, body);
}
export async function deleteTemplate(id: string): Promise<any> {
  return api.delete(`/api/pianat-admin/tenant-templates/${encodeURIComponent(id)}`);
}

// ── Provisioning ──────────────────────────────────────────────────────────

export interface ProvisionTenantInput {
  name: string;
  name_ar?: string;
  slug: string;
  archetype: string;
  parent_tenant_id?: string;
  industry?: string;
  contact_info?: string;
  default_language: 'en' | 'ar';
  ui_direction?: 'ltr' | 'rtl';
  market_profile?: string;
  data_residency_region?: string;
  enabled_modules: string[];
  active_frameworks: string[];
  enabled_ai_agents: string[];
  usage_limits: Record<string, number>;
  subscription?: {
    plan: string;
    monthly_price_usd: number;
    currency: string;
    started_at?: string;
  };
  initial_admin: {
    email: string;
    name: string;
    username: string;
    send_invite_email?: boolean;
  };
  provisioning_notes?: string;
}

export async function provisionTenant(input: ProvisionTenantInput): Promise<any> {
  return api.post('/api/pianat-admin/tenants', input);
}

export async function provisionFromTemplate(templateId: string, overrides: any): Promise<any> {
  return api.post(
    `/api/pianat-admin/tenants/from-template/${encodeURIComponent(templateId)}`,
    overrides,
  );
}

// ── Company Profiler (onboarding intelligence) ──────────────────────────────
// Async, non-blocking suggestion layer triggered by the company name in the
// wizard. Everything it returns is advisory and must be reviewed by ops.

export type CompanyProfileStatus =
  | 'queued'
  | 'running'
  | 'stage_a_done'
  | 'profiling_b'
  | 'done'
  | 'failed';

export interface CompanyProfileSubsidiary {
  name_en: string | null;
  name_ar: string | null;
  name_ar_verified: boolean;
  is_egx_listed: boolean;
  status: string;
  source_url: string;
}

export interface CompanyProfileResult {
  stage: 'A' | 'B';
  source: string;
  verified: boolean;
  requires_review: boolean;
  query_name: string;
  confidence: number;
  match_status: 'CONFIRMED' | 'NOT_FOUND' | 'NOT_LISTED_YET';
  wizard_prefill: {
    legal_name_en: string | null;
    name_ar: string | null;
    name_ar_verified: boolean;
    country: string | null;
    industry: string | null;
    website: string | null;
    is_egx_listed: boolean;
    egx_ticker: string | null;
    suggested_template_hint: string | null;
    suggested_frameworks: string[];
  };
  regulatory_candidates: {
    regulators: Array<'FRA' | 'CBE' | 'EGX'>;
    is_regulated: boolean;
    is_public_company: boolean;
    is_financial_entity: boolean;
    is_government_owned: boolean;
  };
  suggested_classification: {
    value: 'simple' | 'enterprise';
    hard_trigger_hit: boolean;
    hard_trigger_reason: string | null;
    no_downgrade_note: string;
    rationale: string;
  };
  dedup_candidates: {
    legal_name_en: string | null;
    name_ar: string | null;
    name_ar_verified: boolean;
    cr_number: string | null;
    similar_names: string[];
    possible_existing_tenant: boolean;
    source_url: string | null;
  };
  hierarchy_candidates: null | {
    group_name: string | null;
    legal_entity_name: string;
    legal_entity_note: string | null;
    is_egx_listed: boolean;
    egx_ticker: string | null;
    subsidiaries: CompanyProfileSubsidiary[];
  };
  inaccessible_urls: string[];
  web_search_note: string;
}

export interface CompanyProfileRun {
  id: string;
  status: CompanyProfileStatus;
  stage: 'A' | 'B' | null;
  query_name: string;
  error: string | null;
  profile: CompanyProfileResult | null;
  updated_at: string;
}

export async function startCompanyProfile(name: string): Promise<{ id: string; status: CompanyProfileStatus }> {
  return api.post('/api/pianat-admin/company-profiler', { name });
}

export async function getCompanyProfile(id: string): Promise<CompanyProfileRun> {
  return api.get(`/api/pianat-admin/company-profiler/${encodeURIComponent(id)}`);
}

export async function deepenCompanyProfile(id: string): Promise<{ id: string; status: CompanyProfileStatus }> {
  return api.post(`/api/pianat-admin/company-profiler/${encodeURIComponent(id)}/deepen`);
}

// ── Tenant list / detail / config ───────────────────────────────────────

export interface TenantListRow {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  archetype: string;
  tenant_type: string;
  is_active: boolean;
  parent_tenant_id: string | null;
  users: number;
  created_at: string;
}

export interface TenantConfiguration {
  enabled_modules: string[];
  active_frameworks: string[];
  enabled_ai_agents: string[];
  usage_limits: Record<string, number>;
  disabled_modules_legacy: string[];
}

export interface TenantDetail {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  archetype: string;
  tenant_type: string;
  industry: string | null;
  contact_info: string | null;
  is_active: boolean;
  parent_tenant_id: string | null;
  provisioned_at: string | null;
  provisioning_notes: string | null;
  created_at: string;
  configuration: TenantConfiguration;
}

export interface UsageVsLimit {
  current: number;
  limit: number | null;
  pct: number | null;
}

export async function listTenants(opts: {
  archetype?: string;
  search?: string;
  page?: number;
  perPage?: number;
} = {}): Promise<{ page: number; per_page: number; total: number; rows: TenantListRow[] }> {
  const p = new URLSearchParams();
  if (opts.archetype) p.set('archetype', opts.archetype);
  if (opts.search) p.set('search', opts.search);
  if (opts.page) p.set('page', String(opts.page));
  if (opts.perPage) p.set('perPage', String(opts.perPage));
  const q = p.toString();
  return api.get(`/api/pianat-admin/tenants${q ? `?${q}` : ''}`);
}

export async function getTenantDetail(id: string): Promise<TenantDetail> {
  return api.get<TenantDetail>(`/api/pianat-admin/tenants/${encodeURIComponent(id)}`);
}

export async function getUsageVsLimits(id: string): Promise<Record<string, UsageVsLimit>> {
  return api.get(`/api/pianat-admin/tenants/${encodeURIComponent(id)}/usage-vs-limits`);
}

export async function setModules(id: string, enabled_modules: string[]): Promise<any> {
  return api.put(`/api/pianat-admin/tenants/${encodeURIComponent(id)}/modules`, { enabled_modules });
}
export async function setFrameworks(id: string, active_frameworks: string[]): Promise<any> {
  return api.put(`/api/pianat-admin/tenants/${encodeURIComponent(id)}/frameworks`, { active_frameworks });
}
export async function setAiAgents(id: string, enabled_ai_agents: string[]): Promise<any> {
  return api.put(`/api/pianat-admin/tenants/${encodeURIComponent(id)}/ai-agents`, { enabled_ai_agents });
}
export async function setLimits(id: string, usage_limits: Record<string, number>): Promise<any> {
  return api.put(`/api/pianat-admin/tenants/${encodeURIComponent(id)}/limits`, { usage_limits });
}

export async function suspendTenant(id: string): Promise<any> {
  return api.post(`/api/pianat-admin/tenants/${encodeURIComponent(id)}/suspend`);
}
export async function reactivateTenant(id: string): Promise<any> {
  return api.post(`/api/pianat-admin/tenants/${encodeURIComponent(id)}/reactivate`);
}
export async function setSubscription(id: string, body: any): Promise<any> {
  return api.post(`/api/pianat-admin/tenants/${encodeURIComponent(id)}/subscription`, body);
}

// ── Audit / metrics / billing / insights ────────────────────────────────

export async function listCrossTenantAudit(opts: {
  actor?: string;
  target?: string;
  action?: string;
  since?: string;
  page?: number;
} = {}): Promise<{ page: number; per_page: number; total: number; rows: any[] }> {
  const p = new URLSearchParams();
  Object.entries(opts).forEach(([k, v]) => v && p.set(k, String(v)));
  const q = p.toString();
  return api.get(`/api/pianat-admin/cross-tenant-audit${q ? `?${q}` : ''}`);
}

/** Fetch the CSV with the Bearer token and trigger a browser download. */
export async function downloadAuditCsv(): Promise<void> {
  const res = await fetch(`${api.getBaseUrl()}/api/pianat-admin/cross-tenant-audit/export.csv`, {
    headers: { Authorization: `Bearer ${getToken() ?? ''}` },
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cross-tenant-audit.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function getPlatformMetrics(): Promise<any> {
  return api.get('/api/pianat-admin/platform-metrics');
}
export async function getTenantHealth(): Promise<any[]> {
  return api.get('/api/pianat-admin/tenant-health');
}
export async function getRevenue(period?: string): Promise<any> {
  const q = period ? `?period=${encodeURIComponent(period)}` : '';
  return api.get(`/api/pianat-admin/billing/revenue${q}`);
}

export async function getInsightsStatus(): Promise<{ agent: string; enabled: boolean }> {
  return api.get('/api/pianat-admin/insights/status');
}
export async function runPlatformInsights(): Promise<any> {
  return api.post('/api/pianat-admin/insights/run');
}
