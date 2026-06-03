/**
 * Phase 3 — /pianat-admin/tenants/:id: tenant detail with a Configuration
 * tab (independently-savable Modules / Frameworks / AI Agents / Limits) and
 * a Usage-vs-Limits widget. Each save shows server warnings (e.g. removing a
 * framework with active findings, limit below current usage).
 */
import React, { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Save } from 'lucide-react';
import {
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
          <button key={tk} className={`rounded-full px-4 py-1 text-sm ${tab === tk ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setTab(tk)}>
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
