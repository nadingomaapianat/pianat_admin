/** Phase 3 — /pianat-admin/metrics: platform health redesign */
import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import {
  getInsightsStatus, getPlatformMetrics, getTenantHealth, runPlatformInsights,
} from '../../services/pianatAdminServices';
import { PlatformOperatorGate, useAsync, useIsAr, tr, Loading, ErrorBox } from './common';
import { useTheme } from '../../context/ThemeContext';
import { usePageHeadingOverride } from '../../components/Layout/PageHeadingContext';

/* ─── Brand tokens ───────────────────────────────────────────────────────── */
const BRAND  = '#1D9E75';
const HOVER  = '#0F6E56';
const ACCENT = '#5DCAA5';
const TINT   = '#E1F5EE';

/* ─── Health score helpers ───────────────────────────────────────────────── */
const healthColors = (score: number) =>
  score >= 75
    ? { bg: 'rgba(29,158,117,0.20)',  color: '#1D9E75' }
    : score >= 50
      ? { bg: 'rgba(245,166,35,0.20)',  color: '#F5A623' }
      : { bg: 'rgba(220,80,80,0.20)',   color: '#E07070' };

/* ════════════════════════════════════════════════════════════════════════════
   Page
════════════════════════════════════════════════════════════════════════════ */
const PlatformMetricsPage: React.FC = () => {
  const isAr = useIsAr();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  usePageHeadingOverride({ hidden: true });

  const metrics        = useAsync<any>(() => getPlatformMetrics(), []);
  const health         = useAsync<any[]>(() => getTenantHealth(), []);
  const insightsStatus = useAsync<{ enabled: boolean }>(() => getInsightsStatus(), []);

  const [insights,  setInsights]  = useState<any | null>(null);
  const [running,   setRunning]   = useState(false);
  const [insErr,    setInsErr]    = useState<string | null>(null);
  const [infoOpen,  setInfoOpen]  = useState(true);

  const insEnabled = insightsStatus.data?.enabled ?? false;

  const runInsights = async () => {
    setRunning(true); setInsErr(null);
    try { setInsights(await runPlatformInsights()); }
    catch (e: any) { setInsErr(e?.message ?? 'Run failed'); }
    finally { setRunning(false); }
  };

  const m = metrics.data;

  /* ─── Per-theme tokens ──────────────────────────────────────────────── */
  const pageBg    = isDark ? '#091812'                      : '#F0F7F4';
  const heroBg    = isDark
    ? 'linear-gradient(135deg, #0d2e22 0%, #091812 100%)'
    : TINT;
  const heroBd    = isDark ? 'rgba(255,255,255,0.07)'       : '#C2E4D8';
  const stripBg   = isDark ? '#091812'                      : '#ffffff';
  const stripBd   = isDark ? 'rgba(255,255,255,0.06)'       : '#E2EDE9';
  const bodyBg    = isDark ? '#091812'                      : '#F0F7F4';
  const titleClr  = isDark ? '#ffffff'                      : '#0F2E22';
  const descClr   = isDark ? 'rgba(255,255,255,0.55)'       : '#2A5C4A';
  const secLblClr = isDark ? '#ffffff'                      : '#0F2E22';
  const mutedClr  = isDark ? 'rgba(255,255,255,0.42)'       : '#6B8C80';
  const thLblClr  = isDark ? 'rgba(255,255,255,0.82)'       : '#6B8C80';
  const thBd      = isDark ? 'rgba(255,255,255,0.08)'       : '#D4EBE1';
  const rowBd     = isDark ? 'rgba(255,255,255,0.05)'       : '#EEF6F2';
  const rowHover  = isDark ? 'rgba(29,158,117,0.05)'        : 'rgba(29,158,117,0.04)';
  const infoBg    = isDark ? 'rgba(29,158,117,0.07)'        : '#E8F8F1';
  const infoBd    = isDark ? 'rgba(29,158,117,0.22)'        : '#B0D8C8';
  const infoTxt   = isDark ? 'rgba(255,255,255,0.65)'       : '#3D6050';
  const tblBg     = isDark ? '#0d1f18'                      : '#ffffff';

  /* Insights button */
  const insBtnBg    = isDark ? 'rgba(29,158,117,0.08)' : '#ffffff';
  const insBtnBd    = isDark ? 'rgba(29,158,117,0.50)' : BRAND;
  const insBtnClr   = isDark ? ACCENT                   : HOVER;
  const insBtnHover = isDark ? 'rgba(29,158,117,0.16)' : TINT;

  return (
    <PlatformOperatorGate>
      <div dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100%', background: pageBg }}>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div style={{ background: heroBg, borderBottom: `1px solid ${heroBd}`, padding: '28px 26px 22px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: BRAND, marginBottom: 8 }}>
            Pianat Admin
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: titleClr, letterSpacing: '-0.01em' }}>
                {tr(isAr, 'Platform metrics', 'مقاييس المنصة')}
              </h1>
              <p style={{ margin: '5px 0 0', fontSize: 13, color: descClr }}>
                {tr(isAr, 'Platform-wide health, revenue and per-tenant activity.', 'صحة المنصة والإيرادات ونشاط كل جهة.')}
              </p>
            </div>
            {/* Run insights button */}
            <button
              type="button"
              disabled={running || !insEnabled}
              onClick={runInsights}
              title={!insEnabled ? tr(isAr, 'Enable ai_agent_platform_insights for Pianat first.', 'فعّل ai_agent_platform_insights أولًا.') : undefined}
              style={{
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 8,
                border: `1px solid ${insBtnBd}`, background: insBtnBg, color: insBtnClr,
                fontSize: 13, fontWeight: 600,
                cursor: (running || !insEnabled) ? 'not-allowed' : 'pointer',
                opacity: (running || !insEnabled) ? 0.55 : 1,
                transition: 'background 0.14s',
              }}
              onMouseEnter={(e) => { if (!running && insEnabled) e.currentTarget.style.background = insBtnHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = insBtnBg; }}
            >
              <Sparkles size={14} />
              {running ? tr(isAr, 'Analyzing…', 'جارٍ التحليل…') : tr(isAr, 'Run insights', 'تشغيل الرؤى')}
            </button>
          </div>
        </div>

        {/* ── KPI strip ────────────────────────────────────────────────── */}
        <div style={{ background: stripBg, borderBottom: `1px solid ${stripBd}`, padding: '14px 26px' }}>
          {metrics.loading ? (
            <Loading />
          ) : metrics.error ? (
            <ErrorBox message={metrics.error} onRetry={metrics.reload} />
          ) : m ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
              <KpiCard isDark={isDark} label={tr(isAr, 'Tenants', 'الجهات')}           value={m.tenants?.total}           delta={m.tenants?.delta} />
              <KpiCard isDark={isDark} label={tr(isAr, 'Active tenants', 'جهات نشطة')} value={m.tenants?.active}          delta={m.tenants?.active_delta} />
              <KpiCard isDark={isDark} label={tr(isAr, 'Users', 'المستخدمون')}          value={m.users?.total}             delta={m.users?.delta} />
              <KpiCard isDark={isDark} label={tr(isAr, 'Active (30d)', 'نشط (٣٠ي)')}   value={m.users?.active_30d}        delta={m.users?.active_30d_delta} />
              <KpiCard isDark={isDark} label={tr(isAr, 'MRR (USD)', 'الإيراد الشهري')} value={`$${m.mrr_usd ?? 0}`}       delta={m.mrr_delta} smallValue />
              <KpiCard isDark={isDark} label={tr(isAr, 'AI cost (mo)', 'تكلفة الذكاء')} value={`$${m.ai?.cost_this_month_usd ?? 0}`} delta={m.ai?.cost_delta} smallValue />
            </div>
          ) : null}
        </div>

        {/* ── Insights error ───────────────────────────────────────────── */}
        {insErr && (
          <div style={{ padding: '16px 26px' }}>
            <ErrorBox message={insErr} />
          </div>
        )}

        {/* ── Insights result ──────────────────────────────────────────── */}
        {insights && (
          <div style={{ padding: '16px 26px 0' }}>
            <InsightsPanel insights={insights} isDark={isDark} isAr={isAr} />
          </div>
        )}

        {/* ── Body: tenant health ──────────────────────────────────────── */}
        <div style={{ background: bodyBg, padding: '14px 26px 20px' }}>

          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: secLblClr }}>
              {tr(isAr, 'Tenant health', 'صحة الجهات')}
            </span>
            {/* Color legend pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {[
                { dot: '#1D9E75', label: '≥ 75' },
                { dot: '#F5A623', label: '50–74' },
                { dot: '#E07070', label: '< 50' },
              ].map(({ dot, label }) => (
                <span key={label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: mutedClr }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0, display: 'inline-block' }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Info box — collapsible */}
          <div style={{
            borderRadius: 10, border: `0.5px solid ${infoBd}`,
            background: infoBg, marginBottom: 16, overflow: 'hidden',
          }}>
            <button
              type="button"
              onClick={() => setInfoOpen((v) => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer',
                color: infoTxt,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700 }}>
                {tr(isAr, 'How the health score is computed', 'كيف تُحتسب درجة الصحة')}
              </span>
              {infoOpen ? <ChevronUp size={14} color={infoTxt} /> : <ChevronDown size={14} color={infoTxt} />}
            </button>
            {infoOpen && (
              <div style={{ padding: '0 16px 13px', fontSize: 12, lineHeight: 1.65, color: infoTxt }}>
                <p dir="ltr" style={{ margin: '0 0 8px', textAlign: 'left' }}>
                  A 0–100 <b>activity</b> score over the last 30 days (not a compliance score):&nbsp;
                  engagement activity (max 40 = active engagements × 10) + user activity
                  (40 × share of users active in 30d) + AI usage (max 20 = AI runs × 2).
                  Suspended = 0.&nbsp;
                  <span style={{ color: '#1D9E75', fontWeight: 600 }}>Green ≥ 75</span> ·&nbsp;
                  <span style={{ color: '#F5A623', fontWeight: 600 }}>Amber 50–74</span> ·&nbsp;
                  <span style={{ color: '#E07070', fontWeight: 600 }}>Red &lt; 50</span>.
                </p>
                <p dir="rtl" style={{ margin: 0, textAlign: 'right', borderTop: `1px solid ${infoBd}`, paddingTop: 8 }}>
                  درجة <b>نشاط</b> من 0 إلى 100 على آخر 30 يومًا (وليست درجة امتثال): نشاط الارتباطات
                  (٤٠ كحد أقصى = الارتباطات النشطة × ١٠) + نشاط المستخدمين (٤٠ × نسبة المستخدمين
                  النشطين خلال ٣٠ يومًا) + استخدام الذكاء الاصطناعي (٢٠ كحد أقصى = تشغيلات الذكاء × ٢).
                  الجهة الموقوفة = صفر.&nbsp;
                  <span style={{ color: '#1D9E75', fontWeight: 600 }}>أخضر ≥ ٧٥</span> ·&nbsp;
                  <span style={{ color: '#F5A623', fontWeight: 600 }}>أصفر ٥٠–٧٤</span> ·&nbsp;
                  <span style={{ color: '#E07070', fontWeight: 600 }}>أحمر &lt; ٥٠</span>.
                </p>
              </div>
            )}
          </div>

          {/* Tenant health table */}
          {health.loading ? <Loading /> : health.error ? <ErrorBox message={health.error} onRetry={health.reload} /> : (
            <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${thBd}` }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: tblBg, fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${thBd}` }}>
                      {[
                        { label: tr(isAr, 'TENANT', 'الجهة'),               align: 'start'  },
                        { label: tr(isAr, 'HEALTH', 'الصحة'),               align: 'center' },
                        { label: tr(isAr, 'ACTIVE USERS 30D', 'نشط ٣٠ي'),  align: 'center' },
                        { label: tr(isAr, 'ENGAGEMENTS', 'ارتباطات'),       align: 'center' },
                        { label: tr(isAr, 'AI RUNS 30D', 'تشغيلات الذكاء'), align: 'center' },
                      ].map((h) => (
                        <th key={h.label} style={{
                          padding: '10px 18px',
                          textAlign: h.align as any,
                          fontSize: 10, fontWeight: 700,
                          letterSpacing: '0.10em', textTransform: 'uppercase',
                          color: thLblClr,
                        }}>
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(health.data ?? []).map((h: any) => (
                      <HealthRow
                        key={h.tenant_id}
                        row={h}
                        textClr={isDark ? '#ffffff' : '#0F2E22'}
                        mutedClr={mutedClr}
                        rowBd={rowBd}
                        rowHover={rowHover}
                      />
                    ))}
                    {(health.data ?? []).length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '40px 18px', textAlign: 'center', color: mutedClr, fontSize: 13 }}>
                          {tr(isAr, 'No health data.', 'لا بيانات صحة.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

      </div>
    </PlatformOperatorGate>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   KpiCard
════════════════════════════════════════════════════════════════════════════ */
const KpiCard: React.FC<{
  isDark: boolean;
  label: string;
  value: React.ReactNode;
  delta?: number | null;
  smallValue?: boolean;
}> = ({ isDark, label, value, delta, smallValue }) => {
  const [hovered, setHovered] = useState(false);

  const bgColor = isDark ? '#0d1f18' : '#ffffff';
  const bd      = hovered ? 'rgba(29,158,117,0.30)' : isDark ? 'rgba(255,255,255,0.08)' : '#D4EBE1';
  const valClr  = isDark ? '#ffffff' : '#0F2E22';
  const lblClr  = isDark ? 'rgba(255,255,255,0.42)' : '#6B8C80';

  /* delta colors */
  let deltaColor = isDark ? 'rgba(255,255,255,0.30)' : '#A3BFB7';
  let DeltaIcon  = null;
  if (delta != null && delta > 0) {
    deltaColor = BRAND;
    DeltaIcon = TrendingUp;
  } else if (delta != null && delta < 0) {
    deltaColor = isDark ? '#E07070' : '#A02020';
    DeltaIcon = TrendingDown;
  }

  return (
    <div
      style={{
        borderRadius: 10, border: `1px solid ${bd}`,
        background: bgColor, padding: '14px 16px',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ fontSize: smallValue ? 17 : 22, fontWeight: 600, color: valClr, lineHeight: 1.1 }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 11, color: lblClr, marginTop: 4 }}>{label}</div>
      {delta != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 11, color: deltaColor }}>
          {DeltaIcon && <DeltaIcon size={12} />}
          {delta > 0 ? '+' : ''}{delta}
        </div>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   HealthRow
════════════════════════════════════════════════════════════════════════════ */
const HealthRow: React.FC<{
  row: any;
  textClr: string;
  mutedClr: string;
  rowBd: string;
  rowHover: string;
}> = ({ row, textClr, mutedClr, rowBd, rowHover }) => {
  const [hovered, setHovered] = useState(false);
  const score  = row.health_score ?? 0;
  const hc     = healthColors(score);

  return (
    <tr
      style={{ borderBottom: `1px solid ${rowBd}`, background: hovered ? rowHover : 'transparent', transition: 'background 0.12s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* TENANT */}
      <td style={{ padding: '12px 18px', fontWeight: 600, color: textClr, fontSize: 13 }}>
        {row.tenant_name ?? row.tenant_id}
      </td>
      {/* HEALTH — circular badge */}
      <td style={{ padding: '12px 18px', textAlign: 'center' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: hc.bg, color: hc.color,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700,
        }}>
          {score}
        </div>
      </td>
      {/* ACTIVE USERS 30D */}
      <td style={{ padding: '12px 18px', textAlign: 'center', color: mutedClr, fontSize: 13 }}>
        {row.signals?.active_users_30d ?? 0}
        <span style={{ opacity: 0.50 }}> / {row.signals?.users ?? 0}</span>
      </td>
      {/* ENGAGEMENTS */}
      <td style={{ padding: '12px 18px', textAlign: 'center', color: mutedClr, fontSize: 13 }}>
        {row.signals?.active_engagements ?? 0}
      </td>
      {/* AI RUNS */}
      <td style={{ padding: '12px 18px', textAlign: 'center', color: mutedClr, fontSize: 13 }}>
        {row.signals?.ai_runs_30d ?? 0}
      </td>
    </tr>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   InsightsPanel
════════════════════════════════════════════════════════════════════════════ */
const InsightsPanel: React.FC<{ insights: any; isDark: boolean; isAr: boolean }> = ({ insights, isDark, isAr }) => {
  const cardBg  = isDark ? '#0d1f18' : '#ffffff';
  const cardBd  = isDark ? 'rgba(255,255,255,0.08)' : '#D4EBE1';
  const textClr = isDark ? '#ffffff' : '#0F2E22';
  const mutedClr= isDark ? 'rgba(255,255,255,0.55)' : '#2A5C4A';

  const sevColor = (sev: string) => {
    if (sev === 'high')   return isDark ? '#E07070' : '#A02020';
    if (sev === 'medium') return '#F5A623';
    return isDark ? 'rgba(255,255,255,0.40)' : '#6B8C80';
  };
  const sevBg = (sev: string) => {
    if (sev === 'high')   return isDark ? 'rgba(220,80,80,0.12)' : '#FDEAEA';
    if (sev === 'medium') return isDark ? 'rgba(245,166,35,0.12)' : '#FEF3DC';
    return isDark ? 'rgba(255,255,255,0.05)' : '#F0F7F4';
  };

  return (
    <div style={{ borderRadius: 10, border: `1px solid ${cardBd}`, background: cardBg, padding: '16px' }}>
      {insights.summary_en && (
        <p style={{ margin: '0 0 12px', fontSize: 13, color: mutedClr, lineHeight: 1.60 }}>
          {tr(isAr, insights.summary_en ?? '', insights.summary_ar ?? insights.summary_en ?? '')}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(insights.insights ?? []).map((ins: any, idx: number) => (
          <div key={idx} style={{
            borderRadius: 9, border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#E2EDE9'}`,
            background: sevBg(ins.severity), padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 }}>
              <AlertTriangle size={13} style={{ flexShrink: 0, color: sevColor(ins.severity) }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: textClr, flex: 1 }}>
                {tr(isAr, ins.title_en, ins.title_ar)}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '2px 7px', borderRadius: 5,
                background: sevBg(ins.severity), color: sevColor(ins.severity),
              }}>
                {ins.severity}
              </span>
            </div>
            <p style={{ margin: '0 0 5px', fontSize: 12.5, color: mutedClr, lineHeight: 1.55 }}>
              {tr(isAr, ins.detail_en, ins.detail_ar)}
            </p>
            {ins.recommended_action_en && (
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: BRAND }}>
                → {tr(isAr, ins.recommended_action_en, ins.recommended_action_ar)}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlatformMetricsPage;
