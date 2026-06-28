/** Phase 3 — /pianat-admin/billing: revenue redesign */
import React, { useState } from 'react';
import { Calendar, ChevronDown, Download, TrendingUp } from 'lucide-react';
import { downloadAuditCsv, getRevenue } from '../../services/pianatAdminServices';
import { PlatformOperatorGate, useAsync, useIsAr, tr, Loading, ErrorBox } from './common';
import { useTheme } from '../../context/ThemeContext';
import { usePageHeadingOverride } from '../../components/Layout/PageHeadingContext';

/* ─── Brand tokens ───────────────────────────────────────────────────────── */
const BRAND  = '#1D9E75';
const HOVER  = '#0F6E56';
const ACCENT = '#5DCAA5';
const TINT   = '#E1F5EE';

/* ─── Plan badge colours ─────────────────────────────────────────────────── */
const planBadge = (plan: string, isDark: boolean) => {
  const p = plan.toLowerCase();
  if (p.includes('enterprise'))
    return isDark
      ? { bg: 'rgba(245,166,35,0.15)', color: '#FAC775' }
      : { bg: '#FEF3DC',               color: '#8A5500' };
  if (p.includes('pro'))
    return isDark
      ? { bg: 'rgba(29,158,117,0.18)', color: '#5DCAA5' }
      : { bg: '#D1F5E5',               color: '#085041' };
  /* starter / free / custom */
  return isDark
    ? { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)' }
    : { bg: '#E2EDE9',                color: '#5A8270' };
};

/* ════════════════════════════════════════════════════════════════════════════
   Page
════════════════════════════════════════════════════════════════════════════ */
const BillingPage: React.FC = () => {
  const isAr = useIsAr();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  usePageHeadingOverride({ hidden: true });

  const [period, setPeriod] = useState('');
  const { data, loading, error, reload } = useAsync<any>(
    () => getRevenue(period || undefined),
    [period],
  );

  /* derived values */
  const byPlan: any[]  = data?.by_plan ?? [];
  const totalMrr       = data?.total_mrr_usd ?? 0;
  const totalSubs      = byPlan.reduce((s: number, r: any) => s + (r.subscriptions ?? 0), 0);
  const avgMrr         = totalSubs > 0 ? Math.round(totalMrr / totalSubs) : 0;
  const aiCost         = data?.ai_cost_usd ?? null;
  const maxSubs        = Math.max(...byPlan.map((r: any) => r.subscriptions ?? 0), 1);
  const displayPeriod  = period || new Date().toISOString().slice(0, 7);

  /* ─── Per-theme tokens ──────────────────────────────────────────────── */
  const pageBg    = isDark ? '#091812'                      : '#F0F7F4';
  const heroBg    = isDark ? '#0d2e22'                      : TINT;
  const heroBd    = isDark ? 'rgba(255,255,255,0.07)'       : '#C2E4D8';
  const stripBg   = isDark ? '#091812'                      : '#ffffff';
  const stripBd   = isDark ? 'rgba(255,255,255,0.06)'       : '#E2EDE9';
  const bodyBg    = isDark ? '#091812'                      : '#F0F7F4';
  const tblBg     = isDark ? '#0d1f18'                      : '#ffffff';
  const titleClr  = isDark ? '#ffffff'                      : '#0F2E22';
  const descClr   = isDark ? 'rgba(255,255,255,0.55)'       : '#2A5C4A';
  const secLbl    = isDark ? '#ffffff'                      : '#0F2E22';
  const thLbl     = isDark ? 'rgba(255,255,255,0.82)'       : '#6B8C80';
  const thBd      = isDark ? 'rgba(255,255,255,0.08)'       : '#D4EBE1';
  const rowBd     = isDark ? 'rgba(255,255,255,0.05)'       : '#EEF6F2';
  const rowHover  = isDark ? 'rgba(29,158,117,0.05)'        : 'rgba(29,158,117,0.04)';
  const totBd     = isDark ? 'rgba(255,255,255,0.10)'       : '#D4EBE1';
  const totTxt    = isDark ? '#ffffff'                      : '#0F2E22';
  const barTrack  = isDark ? 'rgba(255,255,255,0.08)'       : '#D4EBE1';
  const shareClr  = isDark ? ACCENT                         : HOVER;
  const mutedClr  = isDark ? 'rgba(255,255,255,0.42)'       : '#6B8C80';

  /* period selector + export button shared ghost style */
  const ghostBd   = isDark ? 'rgba(255,255,255,0.18)'       : '#C2E4D8';
  const ghostClr  = isDark ? 'rgba(255,255,255,0.70)'       : '#2A5C4A';

  const expBd     = isDark ? 'rgba(255,255,255,0.18)'       : BRAND;
  const expClr    = isDark ? 'rgba(255,255,255,0.70)'       : HOVER;
  const expHover  = isDark ? 'rgba(255,255,255,0.06)'       : TINT;

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
                {tr(isAr, 'Billing & revenue', 'الفوترة والإيرادات')}
              </h1>
              <p style={{ margin: '5px 0 0', fontSize: 12.5, color: descClr }}>
                {tr(isAr, 'Monthly recurring revenue by subscription plan.', 'الإيراد الشهري المتكرر حسب خطة الاشتراك.')}
              </p>
            </div>
            {/* Period selector — styled button over native month input */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                type="button"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '8px 14px', borderRadius: 8,
                  border: `1px solid ${ghostBd}`, background: 'transparent', color: ghostClr,
                  fontSize: 13, fontWeight: 500, cursor: 'pointer', pointerEvents: 'none',
                  transition: 'background 0.14s',
                }}
              >
                <Calendar size={13} />
                <span>{displayPeriod}</span>
                <ChevronDown size={12} />
              </button>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{
                  position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%',
                }}
                title={tr(isAr, 'Select period', 'اختر الفترة')}
              />
            </div>
          </div>
        </div>

        {/* ── Revenue strip ────────────────────────────────────────────── */}
        <div style={{ background: stripBg, borderBottom: `1px solid ${stripBd}`, padding: '14px 26px' }}>
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {/* Total MRR — highlighted primary card */}
              <RevCard
                isDark={isDark}
                primary
                label={tr(isAr, 'Total MRR', 'إجمالي الإيراد الشهري')}
                value={`$${totalMrr.toLocaleString()}`}
                sub={data?.period ?? displayPeriod}
                delta={null}
                progress={100}
                barTrack={barTrack}
              />
              <RevCard
                isDark={isDark}
                label={tr(isAr, 'Subscriptions', 'الاشتراكات')}
                value={String(totalSubs)}
                sub={tr(isAr, 'active plans', 'خطة نشطة')}
                delta={null}
                progress={Math.min(100, (totalSubs / 10) * 100)}
                barTrack={barTrack}
              />
              <RevCard
                isDark={isDark}
                label={tr(isAr, 'Avg MRR / tenant', 'متوسط الإيراد / جهة')}
                value={`$${avgMrr.toLocaleString()}`}
                sub={tr(isAr, 'per subscription', 'لكل اشتراك')}
                delta={null}
                progress={totalMrr > 0 ? Math.min(100, (avgMrr / totalMrr) * 100 * totalSubs) : 0}
                barTrack={barTrack}
              />
              <RevCard
                isDark={isDark}
                label={tr(isAr, 'AI cost (mo)', 'تكلفة الذكاء الشهري')}
                value={aiCost != null ? `$${aiCost.toLocaleString()}` : '—'}
                sub={tr(isAr, 'this month', 'هذا الشهر')}
                delta={null}
                progress={aiCost != null && totalMrr > 0 ? Math.min(100, (aiCost / totalMrr) * 100) : 20}
                barTrack={barTrack}
              />
            </div>
          )}
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div style={{ background: bodyBg, padding: '14px 26px 24px' }}>

          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: secLbl }}>
              {tr(isAr, 'Revenue by plan', 'الإيراد حسب الخطة')}
            </span>
            {/* Export CSV ghost button */}
            <button
              type="button"
              onClick={() => downloadAuditCsv().catch((e) => alert(e?.message ?? 'Export failed'))}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${expBd}`, background: 'transparent', color: expClr,
                fontSize: 12.5, fontWeight: 600, transition: 'background 0.14s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = expHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Download size={13} />
              {tr(isAr, 'Export CSV', 'تصدير CSV')}
            </button>
          </div>

          {/* Plan table */}
          {!loading && !error && (
            <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${thBd}` }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: tblBg, fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${thBd}` }}>
                      {[
                        { label: tr(isAr, 'PLAN', 'الخطة'),            align: 'start'  },
                        { label: tr(isAr, 'CURRENCY', 'العملة'),       align: 'start'  },
                        { label: tr(isAr, 'SUBSCRIPTIONS', 'الاشتراكات'), align: 'start' },
                        { label: tr(isAr, 'MRR (USD)', 'الإيراد الشهري'), align: 'end'  },
                        { label: tr(isAr, 'SHARE', 'الحصة'),           align: 'end'    },
                      ].map((h) => (
                        <th key={h.label} style={{
                          padding: '10px 18px', textAlign: h.align as any,
                          fontSize: 10, fontWeight: 700,
                          letterSpacing: '0.10em', textTransform: 'uppercase',
                          color: thLbl,
                        }}>
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {byPlan.map((r: any, i: number) => (
                      <PlanRow
                        key={i}
                        row={r}
                        isDark={isDark}
                        totalMrr={totalMrr}
                        maxSubs={maxSubs}
                        rowBd={rowBd}
                        rowHover={rowHover}
                        barTrack={barTrack}
                        shareClr={shareClr}
                        mutedClr={mutedClr}
                        titleClr={titleClr}
                      />
                    ))}
                    {byPlan.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '40px 18px', textAlign: 'center', color: mutedClr, fontSize: 13 }}>
                          {tr(isAr, 'No active subscriptions in this period.', 'لا اشتراكات نشطة في هذه الفترة.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals row */}
              {byPlan.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 18px', borderTop: `1px solid ${totBd}`, background: tblBg,
                }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: totTxt }}>
                    {tr(isAr, 'Total', 'الإجمالي')}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: totTxt }}>
                    ${totalMrr.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </PlatformOperatorGate>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   RevCard — KPI strip card
════════════════════════════════════════════════════════════════════════════ */
const RevCard: React.FC<{
  isDark: boolean;
  primary?: boolean;
  label: string;
  value: string;
  sub: string;
  delta: number | null;
  progress: number;
  barTrack: string;
}> = ({ isDark, primary, label, value, sub, delta, progress, barTrack }) => {
  const [hovered, setHovered] = useState(false);

  const bg = primary
    ? isDark ? '#0d2e22' : TINT
    : isDark ? '#0d1f18' : '#ffffff';

  const bd = hovered
    ? 'rgba(29,158,117,0.30)'
    : primary
      ? isDark ? 'rgba(29,158,117,0.40)' : BRAND
      : isDark ? 'rgba(255,255,255,0.08)' : '#D4EBE1';

  const valClr  = isDark ? '#ffffff'                      : '#0F2E22';
  const lblClr  = isDark ? 'rgba(255,255,255,0.42)'       : '#6B8C80';
  const subClr  = isDark ? 'rgba(255,255,255,0.42)'       : '#6B8C80';
  const dltClr  = delta != null && delta > 0 ? BRAND
    : isDark ? 'rgba(255,255,255,0.28)' : '#6B8C80';

  const pct = Math.max(0, Math.min(100, progress));

  return (
    <div
      style={{
        borderRadius: 10, border: `1px solid ${bd}`, background: bg,
        padding: '14px 16px 12px', transition: 'border-color 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: lblClr, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, color: valClr, lineHeight: 1, marginBottom: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11.5, color: subClr, marginBottom: 10 }}>{sub}</div>

      {/* Delta row (shown only when delta is not null) */}
      {delta != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: dltClr, marginBottom: 8 }}>
          {delta > 0 && <TrendingUp size={12} />}
          {delta > 0 ? `+${delta}` : String(delta)}
        </div>
      )}

      {/* Mini progress bar */}
      <div style={{ height: 4, borderRadius: 99, background: barTrack, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 99, background: BRAND, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   PlanRow — table row (isolated for hover state)
════════════════════════════════════════════════════════════════════════════ */
const PlanRow: React.FC<{
  row: any; isDark: boolean; totalMrr: number; maxSubs: number;
  rowBd: string; rowHover: string; barTrack: string;
  shareClr: string; mutedClr: string; titleClr: string;
}> = ({ row, isDark, totalMrr, maxSubs, rowBd, rowHover, barTrack, shareClr, mutedClr, titleClr }) => {
  const [hovered, setHovered] = useState(false);
  const badge   = planBadge(row.plan ?? '', isDark);
  const share   = totalMrr > 0 ? ((row.mrr_usd / totalMrr) * 100).toFixed(1) : '0.0';
  const barPct  = maxSubs > 0 ? Math.round((row.subscriptions / maxSubs) * 100) : 0;

  return (
    <tr
      style={{
        borderBottom: `1px solid ${rowBd}`,
        background: hovered ? rowHover : 'transparent',
        transition: 'background 0.12s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* PLAN + badge */}
      <td style={{ padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: titleClr }}>{row.plan ?? '—'}</span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99,
            background: badge.bg, color: badge.color,
          }}>
            {row.plan ?? '—'}
          </span>
        </div>
      </td>
      {/* CURRENCY */}
      <td style={{ padding: '12px 18px', color: mutedClr, fontSize: 13 }}>
        {row.currency ?? 'USD'}
      </td>
      {/* SUBSCRIPTIONS + mini bar */}
      <td style={{ padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: titleClr, fontWeight: 500 }}>{row.subscriptions ?? 0}</span>
          <div style={{ width: 80, height: 5, borderRadius: 99, background: barTrack, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ height: '100%', width: `${barPct}%`, borderRadius: 99, background: BRAND }} />
          </div>
        </div>
      </td>
      {/* MRR USD */}
      <td style={{ padding: '12px 18px', textAlign: 'right', fontSize: 14, fontWeight: 600, color: titleClr }}>
        ${(row.mrr_usd ?? 0).toLocaleString()}
      </td>
      {/* SHARE */}
      <td style={{ padding: '12px 18px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: shareClr }}>
        {share}%
      </td>
    </tr>
  );
};

export default BillingPage;
