/**
 * Phase 3 — /pianat-admin/tenants/:id: tenant detail with a Configuration
 * tab (independently-savable Modules / Frameworks / AI Agents / Limits) and
 * a Usage-vs-Limits widget. Each save shows server warnings (e.g. removing a
 * framework with active findings, limit below current usage).
 */
import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Save, Sparkles } from 'lucide-react';
import {
  CompanyProfileResult,
  getCompanyProfileByTenant,
  getFrameworkCodes,
  getModuleCatalog,
  getTenantDetail,
  getUsageVsLimits,
  ModuleCatalogEntry,
  reactivateTenant,
  setAiAgents,
  setFrameworks,
  setLimits,
  setModules,
  suspendTenant,
  TenantDetail,
  updateCompanyProfile,
  UsageVsLimit,
} from '../../services/pianatAdminServices';
import { PianatShell, useAsync, useIsAr, tr, Loading, ErrorBox, Panel, headerBtn } from './common';

// Framework codes are fetched from the backend so they match the seeded data.
const AI_AGENTS = ['policy_reader', 'gap_detector', 'cross_mapper', 'risk_scorer', 'recommender', 'self_assessment_coach', 'platform_insights', 'rollup_anomaly', 'branch_ops'];
const LIMIT_KEYS = ['max_users', 'max_engagements_active', 'max_ai_cost_usd_monthly', 'max_documents', 'max_self_assessments'];

function pctTone(pct: number | null): string {
  if (pct === null) return 'bg-slate-100 text-slate-500';
  if (pct >= 90) return 'bg-rose-100 text-rose-700';
  if (pct >= 70) return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-100 text-emerald-700';
}

const TenantConfigDetailPage: React.FC = () => {
  const isAr = useIsAr();
  const { id } = useParams<{ id: string }>();
  const detail = useAsync<TenantDetail>(() => getTenantDetail(id!), [id]);
  const usage = useAsync<Record<string, UsageVsLimit>>(() => getUsageVsLimits(id!), [id]);
  const catalog = useAsync<ModuleCatalogEntry[]>(() => getModuleCatalog(), []);
  const frameworksList = useAsync<string[]>(() => getFrameworkCodes(), []);
  const FRAMEWORKS = frameworksList.data ?? [];
  const profileRun = useAsync(() => getCompanyProfileByTenant(id!), [id]);
  const [tab, setTab] = useState<'overview' | 'config'>('overview');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Local editable copies of config.
  const cfg = detail.data?.configuration;
  const [modules, setM] = useState<string[] | null>(null);
  const [frameworks, setF] = useState<string[] | null>(null);
  const [agents, setA] = useState<string[] | null>(null);
  const [limits, setL] = useState<Record<string, number> | null>(null);

  const M = modules ?? cfg?.enabled_modules ?? [];
  const F = frameworks ?? cfg?.active_frameworks ?? [];
  const A = agents ?? cfg?.enabled_ai_agents ?? [];
  const L = limits ?? cfg?.usage_limits ?? {};

  const availableModules = useMemo(
    () => (catalog.data ?? []).filter((m) => m.available_for_archetypes.includes(detail.data?.archetype ?? 'client')),
    [catalog.data, detail.data?.archetype],
  );

  const run = async (fn: () => Promise<any>, successEn: string, successAr: string) => {
    setBusy(true);
    setMsg(null);
    setWarnings([]);
    try {
      const r = await fn();
      setMsg(tr(isAr, successEn, successAr));
      if (Array.isArray(r?.warnings) && r.warnings.length) {
        setWarnings(
          r.warnings.map((w: any) =>
            w.framework
              ? tr(isAr, `Removing ${w.framework} hides ${w.active_findings} findings.`, `إزالة ${w.framework} تُخفي ${w.active_findings} ملاحظة.`)
              : tr(isAr, `${w.metric}: new limit ${w.new_limit} is below current usage ${w.current_usage}.`, `${w.metric}: الحد الجديد ${w.new_limit} أقل من الاستخدام الحالي ${w.current_usage}.`),
          ),
        );
      }
      await detail.reload();
      await usage.reload();
    } catch (e: any) {
      setWarnings([e?.message ?? 'Save failed']);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (arr: string[], v: string, setFn: (x: string[]) => void) =>
    setFn(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  if (detail.loading) return <Loading />;
  if (detail.error) return <ErrorBox message={detail.error} onRetry={detail.reload} />;
  if (!detail.data) return null;
  const t = detail.data;

  return (
    <PianatShell
      titleEn={t.name}
      titleAr={t.name_ar ?? t.name}
      subtitleEn={`${t.archetype} · ${t.slug}`}
      subtitleAr={`${t.archetype} · ${t.slug}`}
      actions={
        <div className="flex gap-2">
          {t.is_active ? (
            <button className={headerBtn} disabled={busy} onClick={() => run(() => suspendTenant(id!), 'Suspended', 'تم الإيقاف')}>
              {tr(isAr, 'Suspend', 'إيقاف')}
            </button>
          ) : (
            <button className={headerBtn} disabled={busy} onClick={() => run(() => reactivateTenant(id!), 'Reactivated', 'تمت إعادة التفعيل')}>
              {tr(isAr, 'Reactivate', 'إعادة تفعيل')}
            </button>
          )}
          <Link to="/pianat-admin/tenants" className={headerBtn}>{tr(isAr, '← All tenants', '→ كل الجهات')}</Link>
        </div>
      }
    >
      <div className="mb-4 flex gap-2">
        {(['overview', 'config'] as const).map((tk) => (
          <button key={tk} className={`rounded-full px-4 py-1 text-sm ${tab === tk ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setTab(tk)}>
            {tk === 'overview' ? tr(isAr, 'Overview', 'نظرة عامة') : tr(isAr, 'Configuration', 'الإعدادات')}
          </button>
        ))}
      </div>

      {msg && <Panel className="mb-3 border border-emerald-200 bg-emerald-50 text-emerald-700">{msg}</Panel>}
      {warnings.length > 0 && (
        <Panel className="mb-3 border border-amber-200 bg-amber-50 text-amber-800">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2"><AlertTriangle size={14} /> {w}</div>
          ))}
        </Panel>
      )}

      {tab === 'overview' && (
        <Panel>
          <h2 className="mb-3 text-base font-semibold">{tr(isAr, 'Usage vs limits', 'الاستخدام مقابل الحدود')}</h2>
          {usage.loading ? <Loading /> : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(usage.data ?? {}).map(([metric, u]) => (
                <div key={metric} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{metric.replace(/_/g, ' ')}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${pctTone(u.pct)}`}>
                      {u.limit === null ? tr(isAr, 'unlimited', 'غير محدود') : `${u.pct}%`}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {Math.round(u.current)}{u.limit !== null ? ` / ${u.limit}` : ''}
                  </div>
                  {u.limit !== null && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${(u.pct ?? 0) >= 90 ? 'bg-rose-500' : (u.pct ?? 0) >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, u.pct ?? 0)}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {tab === 'overview' && profileRun.data?.profile && (
        <WebProfilerPanel
          runId={profileRun.data.id}
          profile={profileRun.data.profile}
          isAr={isAr}
          onSaved={profileRun.reload}
        />
      )}

      {tab === 'config' && (
        <div className="grid gap-4">
          {/* Modules */}
          <ConfigCard
            title={tr(isAr, 'Modules', 'الوحدات')}
            onSave={() => run(() => setModules(id!, M), 'Modules saved', 'تم حفظ الوحدات')}
            busy={busy}
          >
            <div className="grid gap-2 md:grid-cols-2">
              {availableModules.map((m) => (
                <label key={m.module_key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={M.includes(m.module_key)} onChange={() => toggle(M, m.module_key, (x) => setM(x))} />
                  {isAr ? m.name_ar : m.name_en}
                </label>
              ))}
            </div>
          </ConfigCard>

          {/* Frameworks */}
          <ConfigCard title={tr(isAr, 'Frameworks', 'الأطر')} onSave={() => run(() => setFrameworks(id!, F), 'Frameworks saved', 'تم حفظ الأطر')} busy={busy}>
            <div className="grid gap-2 md:grid-cols-3">
              {FRAMEWORKS.map((f) => (
                <label key={f} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={F.includes(f)} onChange={() => toggle(F, f, (x) => setF(x))} /> {f}
                </label>
              ))}
            </div>
          </ConfigCard>

          {/* AI agents */}
          <ConfigCard title={tr(isAr, 'AI agents', 'وكلاء الذكاء')} onSave={() => run(() => setAiAgents(id!, A), 'AI agents saved', 'تم الحفظ')} busy={busy}>
            <div className="grid gap-2 md:grid-cols-2">
              {AI_AGENTS.map((a) => (
                <label key={a} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={A.includes(a)} onChange={() => toggle(A, a, (x) => setA(x))} /> {a.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </ConfigCard>

          {/* Limits */}
          <ConfigCard title={tr(isAr, 'Usage limits', 'حدود الاستخدام')} onSave={() => run(() => setLimits(id!, L), 'Limits saved', 'تم حفظ الحدود')} busy={busy}>
            <div className="grid gap-3 md:grid-cols-2">
              {LIMIT_KEYS.map((k) => (
                <div key={k}>
                  <label className="form-label text-xs">{k.replace(/_/g, ' ')}</label>
                  <input type="number" min={0} className="form-control" value={L[k] ?? ''} placeholder={tr(isAr, 'unlimited', 'غير محدود')}
                    onChange={(e) => {
                      const next = { ...L };
                      if (e.target.value === '') delete next[k]; else next[k] = Number(e.target.value);
                      setL(next);
                    }} />
                </div>
              ))}
            </div>
          </ConfigCard>
        </div>
      )}
    </PianatShell>
  );
};

/**
 * Web-profiler data captured at onboarding, stored against the tenant. Ops can
 * edit it here and it persists — so it's visible again on the next visit.
 */
const WebProfilerPanel: React.FC<{
  runId: string;
  profile: CompanyProfileResult;
  isAr: boolean;
  onSaved: () => void;
}> = ({ runId, profile, isAr, onSaved }) => {
  const wp = profile.wizard_prefill;
  const [f, setF] = useState({
    legal_name_en: wp.legal_name_en ?? '',
    name_ar: wp.name_ar ?? '',
    country: wp.country ?? '',
    industry: wp.industry ?? '',
    website: wp.website ?? '',
    egx_ticker: wp.egx_ticker ?? '',
    note: profile.web_search_note ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const upd = (k: keyof typeof f, v: string) => {
    setF((s) => ({ ...s, [k]: v }));
    setSaved(false);
  };
  const save = async () => {
    setSaving(true);
    try {
      await updateCompanyProfile(runId, {
        wizard_prefill: {
          ...wp,
          legal_name_en: f.legal_name_en || null,
          name_ar: f.name_ar || null,
          country: f.country || null,
          industry: f.industry || null,
          website: f.website || null,
          egx_ticker: f.egx_ticker || null,
        },
        web_search_note: f.note,
      } as any);
      setSaved(true);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const regulators = profile.regulatory_candidates?.regulators ?? [];
  const cls = profile.suggested_classification;

  return (
    <Panel className="mt-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Sparkles size={16} className="text-emerald-600" />
          {tr(isAr, 'Web profiler data', 'بيانات محلّل الويب')}
        </h2>
        <button className="btn btn-sm btn-primary d-flex align-items-center" style={{ gap: 4 }} disabled={saving} onClick={save}>
          <Save size={13} /> {saved ? tr(isAr, 'Saved', 'تم الحفظ') : tr(isAr, 'Save', 'حفظ')}
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
        {profile.requires_review && !(profile as any).verified && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">{tr(isAr, 'Needs review', 'بحاجة لمراجعة')}</span>
        )}
        {regulators.map((r) => <span key={r} className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">{r}</span>)}
        {cls?.value && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
            {cls.value === 'enterprise' ? tr(isAr, 'Enterprise', 'مؤسسي') : tr(isAr, 'Simple', 'بسيط')}
          </span>
        )}
        <span className="text-slate-400">
          {tr(isAr, 'confidence', 'الثقة')} {Math.round((profile.confidence ?? 0) * 100)}%
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="form-label text-xs">{tr(isAr, 'Legal name (EN)', 'الاسم القانوني')}</label>
          <input className="form-control" value={f.legal_name_en} onChange={(e) => upd('legal_name_en', e.target.value)} />
        </div>
        <div>
          <label className="form-label text-xs">{tr(isAr, 'Name (AR)', 'الاسم بالعربية')}</label>
          <input className="form-control" dir="rtl" value={f.name_ar} onChange={(e) => upd('name_ar', e.target.value)} />
        </div>
        <div>
          <label className="form-label text-xs">{tr(isAr, 'Country', 'الدولة')}</label>
          <input className="form-control" value={f.country} onChange={(e) => upd('country', e.target.value)} />
        </div>
        <div>
          <label className="form-label text-xs">{tr(isAr, 'Industry', 'القطاع')}</label>
          <input className="form-control" value={f.industry} onChange={(e) => upd('industry', e.target.value)} />
        </div>
        <div>
          <label className="form-label text-xs">{tr(isAr, 'Website', 'الموقع')}</label>
          <input className="form-control" value={f.website} onChange={(e) => upd('website', e.target.value)} />
        </div>
        <div>
          <label className="form-label text-xs">{tr(isAr, 'EGX ticker', 'رمز البورصة')}</label>
          <input className="form-control" value={f.egx_ticker} onChange={(e) => upd('egx_ticker', e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className="form-label text-xs">{tr(isAr, 'Notes', 'ملاحظات')}</label>
          <textarea className="form-control" rows={2} value={f.note} onChange={(e) => upd('note', e.target.value)} />
        </div>
      </div>
    </Panel>
  );
};

const ConfigCard: React.FC<{ title: string; onSave: () => void; busy: boolean; children: React.ReactNode }> = ({ title, onSave, busy, children }) => (
  <Panel>
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-base font-semibold">{title}</h3>
      <button className="btn btn-sm btn-primary d-flex align-items-center" style={{ gap: 4 }} disabled={busy} onClick={onSave}>
        <Save size={13} /> Save
      </button>
    </div>
    {children}
  </Panel>
);

export default TenantConfigDetailPage;
