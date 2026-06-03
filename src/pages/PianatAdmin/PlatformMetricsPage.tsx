/** Phase 3 — /pianat-admin/metrics: platform health + per-tenant health + insights. */
import React, { useState } from 'react';
import { Sparkles, AlertTriangle } from 'lucide-react';
import {
  getInsightsStatus,
  getPlatformMetrics,
  getTenantHealth,
  runPlatformInsights,
} from '../../services/pianatAdminServices';
import { PianatShell, useAsync, useIsAr, tr, Loading, ErrorBox, Panel, headerBtnPrimary } from './common';

const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Panel><div className="text-2xl font-bold">{value}</div><div className="text-xs text-slate-500">{label}</div></Panel>
);

const PlatformMetricsPage: React.FC = () => {
  const isAr = useIsAr();
  const metrics = useAsync<any>(() => getPlatformMetrics(), []);
  const health = useAsync<any[]>(() => getTenantHealth(), []);
  const insightsStatus = useAsync<{ enabled: boolean }>(() => getInsightsStatus(), []);
  const [insights, setInsights] = useState<any | null>(null);
  const [running, setRunning] = useState(false);
  const [insErr, setInsErr] = useState<string | null>(null);

  const runInsights = async () => {
    setRunning(true); setInsErr(null);
    try { setInsights(await runPlatformInsights()); }
    catch (e: any) { setInsErr(e?.message ?? 'Run failed'); }
    finally { setRunning(false); }
  };

  const m = metrics.data;

  return (
    <PianatShell
      titleEn="Platform metrics"
      titleAr="مقاييس المنصة"
      subtitleEn="Platform-wide health, revenue and per-tenant activity."
      subtitleAr="صحة المنصة والإيرادات ونشاط كل جهة."
      actions={
        <button className={headerBtnPrimary} disabled={running || !insightsStatus.data?.enabled} onClick={runInsights}
          title={insightsStatus.data?.enabled ? undefined : tr(isAr, 'Enable ai_agent_platform_insights for Pianat first.', 'فعّل ai_agent_platform_insights أولًا.')}>
          <Sparkles size={15} /> {running ? tr(isAr, 'Analyzing…', 'جارٍ التحليل…') : tr(isAr, 'Run insights', 'تشغيل الرؤى')}
        </button>
      }
    >
      {metrics.loading ? <Loading /> : metrics.error ? <ErrorBox message={metrics.error} onRetry={metrics.reload} /> : m ? (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Stat label={tr(isAr, 'Tenants', 'الجهات')} value={m.tenants.total} />
          <Stat label={tr(isAr, 'Active tenants', 'جهات نشطة')} value={m.tenants.active} />
          <Stat label={tr(isAr, 'Users', 'المستخدمون')} value={m.users.total} />
          <Stat label={tr(isAr, 'Active (30d)', 'نشط (٣٠ي)')} value={m.users.active_30d} />
          <Stat label={tr(isAr, 'MRR (USD)', 'الإيراد الشهري')} value={`$${m.mrr_usd}`} />
          <Stat label={tr(isAr, 'AI cost (mo)', 'تكلفة الذكاء')} value={`$${m.ai.cost_this_month_usd}`} />
        </div>
      ) : null}

      {insErr && <div className="mt-3"><ErrorBox message={insErr} /></div>}
      {insights && (
        <Panel className="mt-4">
          <div className="mb-2 text-sm text-slate-600">{tr(isAr, insights.summary_en ?? '', insights.summary_ar ?? insights.summary_en ?? '')}</div>
          <div className="grid gap-2">
            {(insights.insights ?? []).map((i: any, idx: number) => (
              <div key={idx} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className={i.severity === 'high' ? 'text-rose-600' : i.severity === 'medium' ? 'text-amber-600' : 'text-slate-400'} />
                  <span className="font-semibold">{tr(isAr, i.title_en, i.title_ar)}</span>
                  <span className="ms-auto text-xs uppercase text-slate-400">{i.severity}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{tr(isAr, i.detail_en, i.detail_ar)}</p>
                <p className="mt-1 text-sm font-medium text-violet-700">→ {tr(isAr, i.recommended_action_en, i.recommended_action_ar)}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel className="mt-4 p-0">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
          <div className="text-base font-semibold">{tr(isAr, 'Tenant health', 'صحة الجهات')}</div>
          {/* How the health score is computed — colored callout, EN + AR. */}
          <div className="max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900">
            <div className="mb-1 font-semibold">{tr(isAr, 'How the health score is computed', 'كيف تُحتسب درجة الصحة')}</div>
            <p dir="ltr" className="text-left">
              A 0–100 <b>activity</b> score over the last 30 days (not a compliance score):
              engagement activity (max 40 = active engagements × 10) + user activity
              (40 × share of users active in 30d) + AI usage (max 20 = AI runs × 2).
              Suspended = 0. <span className="text-emerald-700">Green ≥ 75</span> ·
              <span className="text-amber-700"> Amber 50–74</span> ·
              <span className="text-rose-700"> Red &lt; 50</span>.
            </p>
            <p dir="rtl" className="mt-1 border-t border-emerald-200 pt-1 text-right">
              درجة <b>نشاط</b> من 0 إلى 100 على آخر 30 يومًا (وليست درجة امتثال): نشاط
              الارتباطات (٤٠ كحد أقصى = الارتباطات النشطة × ١٠) + نشاط المستخدمين (٤٠ × نسبة
              المستخدمين النشطين خلال ٣٠ يومًا) + استخدام الذكاء الاصطناعي (٢٠ كحد أقصى =
              تشغيلات الذكاء × ٢). الجهة الموقوفة = صفر. أخضر ≥ ٧٥ · أصفر ٥٠–٧٤ · أحمر &lt; ٥٠.
            </p>
          </div>
        </div>
        {health.loading ? <Loading /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 text-start">{tr(isAr, 'Tenant', 'الجهة')}</th>
                <th className="px-4 py-2 text-center">{tr(isAr, 'Health', 'الصحة')}</th>
                <th className="px-4 py-2 text-center">{tr(isAr, 'Active users 30d', 'نشط ٣٠ي')}</th>
                <th className="px-4 py-2 text-center">{tr(isAr, 'Engagements', 'ارتباطات')}</th>
                <th className="px-4 py-2 text-center">{tr(isAr, 'AI runs 30d', 'تشغيلات الذكاء')}</th>
              </tr>
            </thead>
            <tbody>
              {(health.data ?? []).map((h: any) => (
                <tr key={h.tenant_id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{h.tenant_name}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${h.health_score >= 75 ? 'bg-emerald-100 text-emerald-700' : h.health_score >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-700'}`}>{h.health_score}</span>
                  </td>
                  <td className="px-4 py-2 text-center">{h.signals.active_users_30d}/{h.signals.users}</td>
                  <td className="px-4 py-2 text-center">{h.signals.active_engagements}</td>
                  <td className="px-4 py-2 text-center">{h.signals.ai_runs_30d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </PianatShell>
  );
};

export default PlatformMetricsPage;
