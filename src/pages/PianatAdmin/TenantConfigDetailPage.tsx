/** Phase 3 — /pianat-admin/tenants/:id: tenant detail redesign */
import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, CheckCircle2,
  PauseCircle, PlayCircle, Save, Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  CompanyProfileResult,
  getCompanyProfileByTenant,
  getFrameworkCodes,
  getModuleCatalog,
  getOrganizationById,
  getTenantDetail,
  getUsageVsLimits,
  ModuleCatalogEntry,
  OrgLicense,
  OrganizationInfo,
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
import { PlatformOperatorGate, useAsync, useIsAr, tr, Loading, ErrorBox } from './common';
import { useTheme } from '../../context/ThemeContext';
import { usePageHeadingOverride } from '../../components/Layout/PageHeadingContext';

/* ─── Brand tokens ────────────────────────────────────────────────────────── */
const BRAND  = '#1D9E75';
const HOVER  = '#0F6E56';
const ACCENT = '#5DCAA5';
const TINT   = '#E1F5EE';

const ARCH_LABEL: Record<string, string> = {
  client: 'Client', consulting_firm: 'Consulting Firm',
  audit_firm: 'Audit Firm', regulator: 'Regulator', platform_operator: 'Platform Operator',
};

const METRIC_LABEL: Record<string, [string, string]> = {
  max_users:               ['Users',              'المستخدمون'],
  max_engagements_active:  ['Engagements Active', 'الانخراطات'],
  max_ai_cost_usd_monthly: ['AI Cost (mo) USD',   'تكلفة الذكاء'],
  max_documents:           ['Documents',          'الوثائق'],
  max_self_assessments:    ['Self Assessments',   'التقييمات'],
  health_score:            ['Health Score',       'درجة الصحة'],
};
const METRIC_PREFIX: Record<string, string> = { max_ai_cost_usd_monthly: '$' };

const AI_AGENTS = [
  'policy_reader', 'gap_detector', 'cross_mapper', 'risk_scorer',
  'recommender', 'self_assessment_coach', 'platform_insights',
  'rollup_anomaly', 'branch_ops',
];
const LIMIT_KEYS = [
  'max_users', 'max_engagements_active', 'max_ai_cost_usd_monthly',
  'max_documents', 'max_self_assessments',
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const healthTier = (s: number) => s >= 75 ? 'Green' : s >= 50 ? 'Amber' : 'Red';
const healthBar  = (s: number) => s >= 75 ? BRAND : s >= 50 ? '#F5A623' : '#E07070';
const healthVal  = (s: number, isDark: boolean) =>
  s >= 75 ? (isDark ? BRAND : HOVER)
  : s >= 50 ? (isDark ? '#F5A623' : '#B07A00')
  : (isDark ? '#E07070' : '#A02020');

const pctBarColor = (pct: number | null) =>
  pct !== null && pct >= 90 ? '#E07070' : pct !== null && pct >= 70 ? '#F5A623' : BRAND;

const pctPill = (pct: number | null, isDark: boolean) =>
  pct !== null && pct >= 90
    ? { bg: isDark ? 'rgba(220,80,80,0.15)' : '#FAEAEA', clr: isDark ? '#E07070' : '#A02020' }
    : pct !== null && pct >= 70
      ? { bg: isDark ? 'rgba(245,166,35,0.15)' : '#FEF3DC', clr: isDark ? '#F5A623' : '#8A5500' }
      : { bg: isDark ? 'rgba(29,158,117,0.12)' : TINT, clr: isDark ? ACCENT : '#085041' };

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

/* ════════════════════════════════════════════════════════════════════════════
   Page
════════════════════════════════════════════════════════════════════════════ */
const TenantConfigDetailPage: React.FC = () => {
  const { t }  = useTranslation();
  const isAr   = useIsAr();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  usePageHeadingOverride({ hidden: true });

  const detail     = useAsync<TenantDetail>(() => getTenantDetail(id!), [id]);
  const usage      = useAsync<Record<string, UsageVsLimit>>(() => getUsageVsLimits(id!), [id]);
  const catalog    = useAsync<ModuleCatalogEntry[]>(() => getModuleCatalog(), []);
  const fwList     = useAsync<string[]>(() => getFrameworkCodes(), []);
  const profileRun = useAsync(() => getCompanyProfileByTenant(id!), [id]);
  const orgInfo    = useAsync<OrganizationInfo | null>(() => getOrganizationById(id!), [id]);

  const FRAMEWORKS = fwList.data ?? [];
  const [tab, setTab]           = useState<'overview' | 'config'>('overview');
  const [busy, setBusy]         = useState(false);
  const [msg, setMsg]           = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const cfg = detail.data?.configuration;
  const [modules, setM]    = useState<string[] | null>(null);
  const [frameworks, setF] = useState<string[] | null>(null);
  const [agents, setA]     = useState<string[] | null>(null);
  const [limits, setL]     = useState<Record<string, number> | null>(null);

  const M = modules    ?? cfg?.enabled_modules   ?? [];
  const F = frameworks ?? cfg?.active_frameworks  ?? [];
  const A = agents     ?? cfg?.enabled_ai_agents  ?? [];
  const L = limits     ?? cfg?.usage_limits       ?? {};

  const availableModules = useMemo(
    () => (catalog.data ?? []).filter(
      (m) => m.available_for_archetypes.includes(detail.data?.archetype ?? 'client'),
    ),
    [catalog.data, detail.data?.archetype],
  );

  const run = async (fn: () => Promise<any>, successMsg: string) => {
    setBusy(true); setMsg(null); setWarnings([]);
    try {
      const r = await fn();
      setMsg(successMsg);
      if (Array.isArray(r?.warnings) && r.warnings.length) {
        setWarnings(r.warnings.map((w: any) =>
          w.framework
            ? t('pa_warn_framework', { framework: w.framework, count: w.active_findings })
            : t('pa_warn_metric', { metric: w.metric, new_limit: w.new_limit, current_usage: w.current_usage }),
        ));
      }
      await detail.reload();
      await usage.reload();
    } catch (e: any) {
      setWarnings([e?.message ?? t('pa_save_failed')]);
    } finally { setBusy(false); }
  };

  const toggle = (arr: string[], v: string, fn: (x: string[]) => void) =>
    fn(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  if (detail.loading) return <Loading />;
  if (detail.error)   return <ErrorBox message={detail.error} onRetry={detail.reload} />;
  if (!detail.data)   return null;
  const tenant = detail.data;

  /* ── Per-theme tokens ──────────────────────────────────────────────────── */
  const pageBg    = isDark ? '#091812'                    : '#F0F7F4';
  const heroBg    = isDark ? '#0d2e22'                    : TINT;
  const heroBd    = isDark ? 'rgba(255,255,255,0.07)'     : '#C2E4D8';
  const tabBg     = isDark ? '#091812'                    : '#ffffff';
  const tabBd     = isDark ? 'rgba(255,255,255,0.08)'     : '#E2EDE9';
  const tabActClr = isDark ? '#ffffff'                    : '#085041';
  const tabMutClr = isDark ? 'rgba(255,255,255,0.4)'      : '#6B8C80';
  const titleClr  = isDark ? '#ffffff'                    : '#0F2E22';
  const descClr   = isDark ? 'rgba(255,255,255,0.55)'     : '#2A5C4A';
  const secLbl    = isDark ? 'rgba(255,255,255,0.30)'     : '#6B8C80';
  const inCtrl    = isDark ? 'rgba(255,255,255,0.12)'     : '#C2E4D8';
  const inBg      = isDark ? 'rgba(255,255,255,0.04)'     : '#F7FCF9';
  const inTxt     = isDark ? 'rgba(255,255,255,0.70)'     : '#0F2E22';
  const archBg    = isDark ? 'rgba(29,158,117,0.15)'      : '#D1F5E5';
  const archClr   = isDark ? ACCENT                       : '#085041';

  return (
    <PlatformOperatorGate>
      <div dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100%', background: pageBg }}>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div style={{ background: heroBg, borderBottom: `1px solid ${heroBd}`, padding: '24px 26px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: BRAND, marginBottom: 10 }}>
            Pianat Admin
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            {/* Left: name + meta + status */}
            <div>
              <h1 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: titleClr, lineHeight: 1.3 }}>
                {isAr && tenant.name_ar ? tenant.name_ar : tenant.name}
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 999, background: archBg, color: archClr }}>
                  {ARCH_LABEL[tenant.archetype] ?? tenant.archetype}
                </span>
                <span style={{ fontSize: 11.5, color: descClr }}>{tenant.slug}</span>
              </div>
              {/* Status pill */}
              {tenant.is_active ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: isDark ? 'rgba(29,158,117,0.15)' : '#D1F5E5' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: BRAND, display: 'inline-block' }} />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: isDark ? ACCENT : '#085041' }}>{tr(isAr, 'active', 'نشطة')}</span>
                </div>
              ) : (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 999, background: isDark ? 'rgba(255,255,255,0.06)' : '#EEF6F2' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: isDark ? 'rgba(255,255,255,0.25)' : '#C2E4D8', display: 'inline-block' }} />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: descClr }}>{tr(isAr, 'inactive', 'غير نشطة')}</span>
                </div>
              )}
            </div>

            {/* Right: hero buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
              <HeroGhostBtn
                isDark={isDark}
                onClick={() => navigate('/pianat-admin/tenants')}
                icon={<ArrowLeft size={13} />}
                label={tr(isAr, 'All tenants', 'كل الجهات')}
              />
              {tenant.is_active ? (
                <SuspendBtn
                  isDark={isDark} disabled={busy}
                  onClick={() => run(() => suspendTenant(id!), t('pa_suspended_success'))}
                  label={tr(isAr, 'Suspend', 'إيقاف')}
                />
              ) : (
                <button
                  type="button" disabled={busy}
                  onClick={() => run(() => reactivateTenant(id!), t('pa_reactivated_success'))}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '8px 14px', borderRadius: 9, border: 'none',
                    background: BRAND, color: '#ffffff',
                    fontSize: 13, fontWeight: 600,
                    cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
                  }}
                >
                  <PlayCircle size={13} />
                  {tr(isAr, 'Reactivate', 'إعادة تفعيل')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Tab row ──────────────────────────────────────────────────── */}
        <div style={{ background: tabBg, borderBottom: `1px solid ${tabBd}`, padding: '0 26px', display: 'flex' }}>
          {(['overview', 'config'] as const).map((tk) => {
            const active = tab === tk;
            return (
              <button
                key={tk} type="button" onClick={() => setTab(tk)}
                style={{
                  padding: '12px 16px', fontSize: 13.5, fontWeight: 600,
                  color: active ? tabActClr : tabMutClr,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderBottom: `2.5px solid ${active ? BRAND : 'transparent'}`,
                  marginBottom: -1, transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                {tk === 'overview' ? tr(isAr, 'Overview', 'نظرة عامة') : tr(isAr, 'Configuration', 'الإعدادات')}
              </button>
            );
          })}
        </div>

        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div style={{ padding: '18px 26px 20px', background: pageBg }}>

          {/* Feedback banners */}
          {msg && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
              padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
              background: isDark ? 'rgba(29,158,117,0.12)' : '#D1F5E5',
              color: isDark ? ACCENT : '#085041',
              border: `1px solid ${isDark ? 'rgba(29,158,117,0.28)' : '#C2E4D8'}`,
            }}>
              <CheckCircle2 size={15} />{msg}
            </div>
          )}
          {warnings.length > 0 && (
            <div style={{
              padding: '10px 16px', borderRadius: 10, marginBottom: 14, fontSize: 13,
              background: 'rgba(245,166,35,0.10)',
              border: '1px solid rgba(245,166,35,0.28)', color: '#F5A623',
            }}>
              {warnings.map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <AlertTriangle size={14} />{w}
                </div>
              ))}
            </div>
          )}

          {/* ══ OVERVIEW TAB ══════════════════════════════════════════════ */}
          {tab === 'overview' && (
            <>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: secLbl, marginBottom: 10 }}>
                {tr(isAr, 'USAGE VS LIMITS', 'الاستخدام مقابل الحدود')}
              </div>

              {usage.loading ? <Loading /> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
                  {Object.entries(usage.data ?? {}).map(([metric, u]) => (
                    <UsageCard key={metric} metric={metric} u={u} isDark={isDark} isAr={isAr} />
                  ))}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 4 }}>
                <InfoCard
                  isDark={isDark}
                  label={tr(isAr, 'Plan', 'الخطة')}
                  value={ARCH_LABEL[tenant.archetype] ?? tenant.archetype}
                  sub={tenant.tenant_type ?? '—'}
                />
                <InfoCard
                  isDark={isDark}
                  label={tr(isAr, 'Created', 'تاريخ الإنشاء')}
                  value={fmtDate(tenant.created_at)}
                  sub={tr(isAr, 'Account provisioned', 'تم إنشاء الحساب')}
                />
                <InfoCard
                  isDark={isDark}
                  label={tr(isAr, 'Last activity', 'آخر نشاط')}
                  value={fmtDate(tenant.provisioned_at ?? tenant.created_at)}
                  sub={tr(isAr, 'Platform provisioned', 'تم تفعيل المنصة')}
                />
              </div>

              {/* ── Organization Profile (GET /tenant/:id) ───────────── */}
              {orgInfo.data && (
                <div style={{ marginTop: 14 }}>
                  <OrgProfilePanel org={orgInfo.data} isDark={isDark} isAr={isAr} />
                </div>
              )}

              {profileRun.data?.profile && (
                <WebProfilerPanel
                  runId={profileRun.data.id}
                  profile={profileRun.data.profile}
                  onSaved={profileRun.reload}
                  isDark={isDark}
                  inCtrl={inCtrl} inBg={inBg} inTxt={inTxt}
                />
              )}
            </>
          )}

          {/* ══ CONFIG TAB ════════════════════════════════════════════════ */}
          {tab === 'config' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ConfigSection
                title={t('pa_modules')}
                onSave={() => run(() => setModules(id!, M), t('pa_modules_saved'))}
                busy={busy} isDark={isDark}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  {availableModules.map((m) => (
                    <CheckRow key={m.module_key} isDark={isDark}
                      label={isAr ? m.name_ar : m.name_en}
                      checked={M.includes(m.module_key)}
                      onChange={() => toggle(M, m.module_key, (x) => setM(x))} />
                  ))}
                </div>
              </ConfigSection>

              <ConfigSection
                title={t('pa_frameworks')}
                onSave={() => run(() => setFrameworks(id!, F), t('pa_frameworks_saved'))}
                busy={busy} isDark={isDark}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
                  {FRAMEWORKS.map((f) => (
                    <CheckRow key={f} isDark={isDark}
                      label={f}
                      checked={F.includes(f)}
                      onChange={() => toggle(F, f, (x) => setF(x))} />
                  ))}
                </div>
              </ConfigSection>

              <ConfigSection
                title={t('pa_ai_agents')}
                onSave={() => run(() => setAiAgents(id!, A), t('pa_ai_agents_saved'))}
                busy={busy} isDark={isDark}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  {AI_AGENTS.map((a) => (
                    <CheckRow key={a} isDark={isDark}
                      label={a.replace(/_/g, ' ')}
                      checked={A.includes(a)}
                      onChange={() => toggle(A, a, (x) => setA(x))} />
                  ))}
                </div>
              </ConfigSection>

              <ConfigSection
                title={t('pa_usage_limits')}
                onSave={() => run(() => setLimits(id!, L), t('pa_limits_saved'))}
                busy={busy} isDark={isDark}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {LIMIT_KEYS.map((k) => (
                    <div key={k}>
                      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: isDark ? 'rgba(255,255,255,0.45)' : '#6B8C80', marginBottom: 5 }}>
                        {t(`pa_metric_label_${k}`, { defaultValue: k.replace(/_/g, ' ') })}
                      </div>
                      <input
                        type="number" min={0}
                        value={L[k] ?? ''}
                        placeholder={t('pa_unlimited')}
                        onChange={(e) => {
                          const next = { ...L };
                          if (e.target.value === '') delete next[k]; else next[k] = Number(e.target.value);
                          setL(next);
                        }}
                        style={{
                          width: '100%', height: 36, paddingInline: '10px', boxSizing: 'border-box',
                          borderRadius: 8, border: `1px solid ${inCtrl}`,
                          background: inBg, color: inTxt, fontSize: 13, outline: 'none',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </ConfigSection>
            </div>
          )}
        </div>
      </div>
    </PlatformOperatorGate>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   HeroGhostBtn
════════════════════════════════════════════════════════════════════════════ */
const HeroGhostBtn: React.FC<{
  isDark: boolean; onClick: () => void; icon: React.ReactNode; label: string;
}> = ({ isDark, onClick, icon, label }) => (
  <button
    type="button" onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '8px 14px', borderRadius: 9, cursor: 'pointer',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.18)' : '#C2E4D8'}`,
      background: 'transparent',
      color: isDark ? 'rgba(255,255,255,0.70)' : '#2A5C4A',
      fontSize: 13, fontWeight: 600, transition: 'background 0.14s',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.06)' : TINT; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
  >
    {icon}{label}
  </button>
);

/* ════════════════════════════════════════════════════════════════════════════
   SuspendBtn
════════════════════════════════════════════════════════════════════════════ */
const SuspendBtn: React.FC<{
  isDark: boolean; disabled: boolean; onClick: () => void; label: string;
}> = ({ isDark, disabled, onClick, label }) => (
  <button
    type="button" disabled={disabled} onClick={onClick}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: '8px 14px', borderRadius: 9,
      cursor: disabled ? 'not-allowed' : 'pointer',
      border: `1px solid ${isDark ? 'rgba(231,76,60,0.45)' : '#F5C4B3'}`,
      background: isDark ? 'rgba(231,76,60,0.08)' : '#FAECE7',
      color: isDark ? '#e87c6e' : '#993C1D',
      fontSize: 13, fontWeight: 600,
      opacity: disabled ? 0.6 : 1, transition: 'background 0.14s',
    }}
    onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = isDark ? 'rgba(231,76,60,0.15)' : '#F9DDD5'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = isDark ? 'rgba(231,76,60,0.08)' : '#FAECE7'; }}
  >
    <PauseCircle size={13} />{label}
  </button>
);

/* ════════════════════════════════════════════════════════════════════════════
   UsageCard
════════════════════════════════════════════════════════════════════════════ */
const UsageCard: React.FC<{
  metric: string; u: UsageVsLimit; isDark: boolean; isAr: boolean;
}> = ({ metric, u, isDark, isAr }) => {
  const [hovered, setHovered] = useState(false);
  const isHealth = metric === 'health_score';
  const prefix   = METRIC_PREFIX[metric] ?? '';
  const lp       = METRIC_LABEL[metric];
  const label    = lp ? tr(isAr, lp[0], lp[1]) : metric.replace(/_/g, ' ');
  const hScore   = u.current;
  const pct      = u.pct ?? 0;

  const cardBg = isHealth
    ? isDark ? 'rgba(29,158,117,0.07)' : '#E8F8F1'
    : isDark ? '#0d1f18' : '#ffffff';
  const cardBd = hovered
    ? 'rgba(29,158,117,0.25)'
    : isHealth
      ? isDark ? 'rgba(29,158,117,0.3)' : '#C2E4D8'
      : isDark ? 'rgba(255,255,255,0.08)' : '#D4EBE1';

  const labelClr = isHealth ? (isDark ? ACCENT : '#0F6E56') : isDark ? 'rgba(255,255,255,0.55)' : '#6B8C80';
  const valClr   = isHealth ? healthVal(hScore, isDark) : isDark ? '#ffffff' : '#0F2E22';
  const subClr   = isDark ? 'rgba(255,255,255,0.40)' : '#6B8C80';
  const barTrack = isDark ? 'rgba(255,255,255,0.08)' : '#D4EBE1';

  const { bg: pBg, clr: pClr } = isHealth
    ? { bg: isDark ? 'rgba(29,158,117,0.12)' : TINT, clr: isDark ? ACCENT : '#085041' }
    : pctPill(u.pct, isDark);

  const barW   = isHealth ? Math.max(0, Math.min(100, hScore)) : u.limit !== null ? Math.min(100, pct) : 4;
  const barFil = isHealth ? healthBar(hScore) : pctBarColor(u.pct);
  const pillTxt = isHealth ? healthTier(hScore) : u.limit === null ? 'Unlimited' : `${pct}%`;
  const subTxt  = isHealth
    ? `${healthTier(hScore)} · last 30 days`
    : u.limit !== null ? `/ ${prefix}${u.limit}` : tr(isAr, 'No limit', 'بلا حد');

  return (
    <div
      style={{
        borderRadius: 11, padding: '16px 18px', border: `0.5px solid ${cardBd}`,
        background: cardBg, display: 'flex', flexDirection: 'column',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: labelClr }}>
          {label}
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: pBg, color: pClr, flexShrink: 0 }}>
          {pillTxt}
        </span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: valClr, lineHeight: 1, marginBottom: 3 }}>
        {prefix}{Math.round(u.current)}
      </div>
      <div style={{ fontSize: 11, color: subClr, marginBottom: 10, flex: 1 }}>{subTxt}</div>
      <div style={{ height: 4, borderRadius: 99, background: barTrack, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${barW}%`, borderRadius: 99, background: barFil, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   InfoCard
════════════════════════════════════════════════════════════════════════════ */
const InfoCard: React.FC<{
  isDark: boolean; label: string; value: string; sub: string;
}> = ({ isDark, label, value, sub }) => (
  <div style={{
    borderRadius: 11, padding: '16px 18px',
    border: `0.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#D4EBE1'}`,
    background: isDark ? '#0d1f18' : '#ffffff',
  }}>
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: isDark ? 'rgba(255,255,255,0.40)' : '#6B8C80', marginBottom: 6 }}>
      {label}
    </div>
    <div style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#ffffff' : '#0F2E22', marginBottom: 3 }}>{value}</div>
    <div style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.35)' : '#6B8C80' }}>{sub}</div>
  </div>
);

/* ════════════════════════════════════════════════════════════════════════════
   OrgProfilePanel — renders data returned by GET /tenant/:id
════════════════════════════════════════════════════════════════════════════ */
const TENANT_TYPE_LABEL: Record<string, string> = {
  group: 'Group', standalone: 'Standalone', branch: 'Branch', subsidiary: 'Subsidiary',
};
const ORG_TYPE_LABEL: Record<string, string> = {
  registered: 'Registered', unregistered: 'Unregistered', individual: 'Individual',
};
const LANG_LABEL: Record<string, string> = { en: 'English', ar: 'Arabic' };
const DIR_LABEL:  Record<string, string> = { ltr: 'Left → Right', rtl: 'Right → Left' };

const OrgProfilePanel: React.FC<{ org: OrganizationInfo; isDark: boolean; isAr: boolean }> = ({ org, isDark, isAr }) => {
  const bd      = isDark ? 'rgba(255,255,255,0.08)'        : '#D4EBE1';
  const bg      = isDark ? '#0d1f18'                       : '#ffffff';
  const secLbl  = isDark ? 'rgba(255,255,255,0.30)'        : '#6B8C80';
  const licBg   = isDark ? 'rgba(29,158,117,0.10)'         : '#E8F8F1';
  const licBd   = isDark ? 'rgba(29,158,117,0.22)'         : '#C2E4D8';
  const licFam  = isDark ? 'rgba(255,255,255,0.35)'        : '#6B8C80';
  const licName = isDark ? ACCENT                          : '#085041';

  const row1: [string, string][] = [
    [tr(isAr, 'Tenant Type',     'نوع الجهة'),       TENANT_TYPE_LABEL[org.tenantType] ?? org.tenantType],
    [tr(isAr, 'Org Type',        'نوع المنظمة'),     ORG_TYPE_LABEL[org.type] ?? org.type],
    [tr(isAr, 'Hierarchy Depth', 'عمق التسلسل'),     String(org.tenantDepth)],
  ];
  const row2: [string, string][] = [
    [tr(isAr, 'Language',    'اللغة'),          LANG_LABEL[org.defaultLanguage] ?? org.defaultLanguage],
    [tr(isAr, 'UI Direction','اتجاه الواجهة'), DIR_LABEL[org.uiDirection]  ?? org.uiDirection],
    [tr(isAr, 'Health Score','درجة الصحة'),    String(org.score)],
  ];
  const extras: [string, string][] = [
    ...(org.industry          ? [[tr(isAr, 'Industry',    'الصناعة'),        org.industry]          as [string,string]] : []),
    ...(org.contactInfo       ? [[tr(isAr, 'Contact',     'التواصل'),         org.contactInfo]       as [string,string]] : []),
    ...(org.dataResidencyRegion ? [[tr(isAr, 'Data Region','منطقة البيانات'), org.dataResidencyRegion] as [string,string]] : []),
  ];

  const hasLicenses = Array.isArray(org.licenses) && org.licenses.length > 0;

  return (
    <div style={{ borderRadius: 11, border: `1px solid ${bd}`, background: bg, padding: '18px 20px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: secLbl, marginBottom: 14 }}>
        {tr(isAr, 'ORGANIZATION PROFILE', 'الملف التنظيمي')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
        {row1.map(([label, value]) => <InfoCard key={label} isDark={isDark} label={label} value={value} sub="" />)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, ...(extras.length || hasLicenses ? { marginBottom: 12 } : {}) }}>
        {row2.map(([label, value]) => <InfoCard key={label} isDark={isDark} label={label} value={value} sub="" />)}
      </div>

      {extras.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, ...(hasLicenses ? { marginBottom: 12 } : {}) }}>
          {extras.map(([label, value]) => <InfoCard key={label} isDark={isDark} label={label} value={value} sub="" />)}
        </div>
      )}

      {hasLicenses && (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: secLbl, marginBottom: 8 }}>
            {tr(isAr, 'LICENSES', 'التراخيص')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {org.licenses.map((lic: OrgLicense, i: number) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', gap: 2,
                padding: '7px 13px', borderRadius: 9,
                background: licBg, border: `1px solid ${licBd}`,
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: licFam }}>
                  {lic.family.replace(/_/g, ' ')}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: licName }}>{lic.name}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   CheckRow
════════════════════════════════════════════════════════════════════════════ */
const CheckRow: React.FC<{
  label: string; checked: boolean; onChange: () => void; isDark: boolean;
}> = ({ label, checked, onChange, isDark }) => {
  const [hov, setHov] = useState(false);
  return (
    <label
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
        background: hov ? (isDark ? 'rgba(255,255,255,0.04)' : TINT) : 'transparent',
        color: isDark ? 'rgba(255,255,255,0.75)' : '#0F2E22',
        fontSize: 13, transition: 'background 0.12s',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <input type="checkbox" checked={checked} onChange={onChange}
        style={{ accentColor: BRAND, flexShrink: 0 }} />
      {label}
    </label>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   SaveBtn
════════════════════════════════════════════════════════════════════════════ */
const SaveBtn: React.FC<{
  busy: boolean; saved: boolean; onClick: () => void; disabled?: boolean;
}> = ({ busy, saved, onClick, disabled }) => {
  const { t } = useTranslation();
  return (
    <button
      type="button" disabled={busy || disabled} onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 8, border: 'none',
        background: BRAND, color: '#ffffff', fontSize: 12.5, fontWeight: 600,
        cursor: busy || disabled ? 'not-allowed' : 'pointer',
        opacity: busy || disabled ? 0.6 : 1, transition: 'opacity 0.15s',
      }}
    >
      <Save size={13} />
      {busy ? t('pa_saving') : saved ? t('pa_saved') : t('pa_save')}
    </button>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   ConfigSection
════════════════════════════════════════════════════════════════════════════ */
const ConfigSection: React.FC<{
  title: string; onSave: () => void; busy: boolean;
  isDark: boolean; children: React.ReactNode;
}> = ({ title, onSave, busy, isDark, children }) => (
  <div style={{
    borderRadius: 11, padding: '20px',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#D4EBE1'}`,
    background: isDark ? '#0d1f18' : '#ffffff',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#ffffff' : '#0F2E22' }}>{title}</span>
      <SaveBtn busy={busy} saved={false} onClick={onSave} />
    </div>
    {children}
  </div>
);

/* ════════════════════════════════════════════════════════════════════════════
   WebProfilerPanel
════════════════════════════════════════════════════════════════════════════ */
const WebProfilerPanel: React.FC<{
  runId: string; profile: CompanyProfileResult; onSaved: () => void;
  isDark: boolean; inCtrl: string; inBg: string; inTxt: string;
}> = ({ runId, profile, onSaved, isDark, inCtrl, inBg, inTxt }) => {
  const { t } = useTranslation();
  const wp = profile.wizard_prefill;
  const [f, setF] = useState({
    legal_name_en: wp.legal_name_en ?? '',
    name_ar:       wp.name_ar ?? '',
    country:       wp.country ?? '',
    industry:      wp.industry ?? '',
    website:       wp.website ?? '',
    egx_ticker:    wp.egx_ticker ?? '',
    note:          profile.web_search_note ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const upd = (k: keyof typeof f, v: string) => { setF((s) => ({ ...s, [k]: v })); setSaved(false); };
  const save = async () => {
    setSaving(true);
    try {
      await updateCompanyProfile(runId, {
        wizard_prefill: {
          ...wp,
          legal_name_en: f.legal_name_en || null, name_ar: f.name_ar || null,
          country: f.country || null, industry: f.industry || null,
          website: f.website || null, egx_ticker: f.egx_ticker || null,
        },
        web_search_note: f.note,
      } as any);
      setSaved(true); onSaved();
    } finally { setSaving(false); }
  };

  const bd     = isDark ? 'rgba(255,255,255,0.08)' : '#D4EBE1';
  const bg     = isDark ? '#0d1f18' : '#ffffff';
  const ttlClr = isDark ? '#ffffff' : '#0F2E22';
  const lblClr = isDark ? 'rgba(255,255,255,0.45)' : '#6B8C80';

  const tagStyle = (kind: 'amber' | 'blue' | 'green'): React.CSSProperties => ({
    fontSize: 11, padding: '2px 9px', borderRadius: 999,
    background: kind === 'amber' ? 'rgba(245,158,11,0.12)' : kind === 'blue' ? 'rgba(59,130,246,0.12)' : 'rgba(29,158,117,0.12)',
    color: kind === 'amber' ? '#fbbf24' : kind === 'blue' ? '#60a5fa' : ACCENT,
  });

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 36, paddingInline: '10px', boxSizing: 'border-box',
    borderRadius: 8, border: `1px solid ${inCtrl}`,
    background: inBg, color: inTxt, fontSize: 13, outline: 'none',
  };

  return (
    <div style={{ borderRadius: 11, border: `1px solid ${bd}`, background: bg, padding: '20px', marginTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, color: ttlClr }}>
          <Sparkles size={15} color={BRAND} />
          {t('pa_web_profiler')}
        </span>
        <SaveBtn busy={saving} saved={saved} onClick={save} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {profile.requires_review && !(profile as any).verified && (
          <span style={tagStyle('amber')}>{t('pa_needs_review')}</span>
        )}
        {(profile.regulatory_candidates?.regulators ?? []).map((r) => (
          <span key={r} style={tagStyle('blue')}>{r}</span>
        ))}
        {profile.suggested_classification?.value && (
          <span style={tagStyle('green')}>
            {profile.suggested_classification.value === 'enterprise' ? t('pa_enterprise') : t('pa_simple')}
          </span>
        )}
        <span style={{ fontSize: 11, color: isDark ? 'rgba(255,255,255,0.40)' : '#6B8C80' }}>
          {t('pa_confidence')} {Math.round((profile.confidence ?? 0) * 100)}%
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {([
          ['legal_name_en', t('pa_legal_name_en'), undefined],
          ['name_ar',       t('pa_name_ar'),       'rtl'],
          ['country',       t('pa_country'),       undefined],
          ['industry',      t('pa_industry'),      undefined],
          ['website',       t('pa_website'),       undefined],
          ['egx_ticker',    t('pa_egx_ticker'),    undefined],
        ] as [keyof typeof f, string, string | undefined][]).map(([key, label, dir]) => (
          <div key={key}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: lblClr, marginBottom: 5 }}>
              {label}
            </div>
            <input dir={dir} value={f[key]} onChange={(e) => upd(key, e.target.value)} style={inputStyle} />
          </div>
        ))}
        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: lblClr, marginBottom: 5 }}>
            {t('pa_notes')}
          </div>
          <textarea
            rows={2} value={f.note} onChange={(e) => upd('note', e.target.value)}
            style={{ ...inputStyle, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
          />
        </div>
      </div>
    </div>
  );
};

export default TenantConfigDetailPage;
