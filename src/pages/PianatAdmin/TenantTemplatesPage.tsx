/** Phase 3 — /pianat-admin/tenant-templates: RTL redesigned list + modal */
import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Power, Star, Trash2, X } from 'lucide-react';
import {
  createTemplate, deleteTemplate, getFrameworkCodes, getModuleCatalog,
  listTemplates, ModuleCatalogEntry, TenantTemplate, updateTemplate,
} from '../../services/pianatAdminServices';
import { PlatformOperatorGate, useAsync, useIsAr, tr, Loading, ErrorBox } from './common';
import { useTheme } from '../../context/ThemeContext';
import { usePageHeadingOverride } from '../../components/Layout/PageHeadingContext';

/* ─── Brand palette (mirrors Login.tsx tokens) ───────────────────────────── */
const BRAND  = '#1D9E75';
const HOVER  = '#0F6E56';
const ACCENT = '#5DCAA5';
const TINT   = '#E1F5EE';

/* ─── Constants ──────────────────────────────────────────────────────────── */
const ARCHETYPES = ['client', 'consulting_firm', 'audit_firm', 'regulator'];
const AI_AGENTS  = ['policy_reader', 'gap_detector', 'cross_mapper', 'risk_scorer', 'recommender', 'self_assessment_coach', 'platform_insights', 'rollup_anomaly', 'branch_ops'];
const PLANS      = ['', 'free', 'starter', 'pro', 'enterprise', 'custom'];
const LIMIT_KEYS = ['max_users', 'max_engagements_active', 'max_ai_cost_usd_monthly', 'max_documents', 'max_self_assessments'];

/* ─── Tier badge tokens ───────────────────────────────────────────────────── */
const tierMeta = (plan: string, isDark: boolean) => {
  if (plan === 'pro')
    return { color: isDark ? '#9FE1CB' : HOVER, bg: isDark ? 'rgba(159,225,203,0.10)' : 'rgba(15,110,86,0.07)', bd: isDark ? 'rgba(159,225,203,0.22)' : 'rgba(15,110,86,0.18)' };
  if (plan === 'enterprise')
    return { color: isDark ? '#FAC775' : '#B07A00', bg: isDark ? 'rgba(250,199,117,0.10)' : 'rgba(176,122,0,0.07)', bd: isDark ? 'rgba(250,199,117,0.25)' : 'rgba(176,122,0,0.18)' };
  return { color: isDark ? 'rgba(255,255,255,0.38)' : '#5A8270', bg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', bd: isDark ? 'rgba(255,255,255,0.08)' : '#D4EBE1' };
};

/* ─── Form state ──────────────────────────────────────────────────────────── */
interface FormState {
  name: string; description: string; archetype: string;
  enabled_modules: string[]; active_frameworks: string[];
  enabled_ai_agents: string[]; usage_limits: Record<string, number>;
  default_subscription_plan: string;
}
const emptyForm = (): FormState => ({
  name: '', description: '', archetype: 'client',
  enabled_modules: [], active_frameworks: [], enabled_ai_agents: [],
  usage_limits: {}, default_subscription_plan: '',
});
const fromTemplate = (t: TenantTemplate): FormState => ({
  name: t.name, description: t.description ?? '', archetype: t.archetype,
  enabled_modules: t.enabled_modules ?? [], active_frameworks: t.active_frameworks ?? [],
  enabled_ai_agents: t.enabled_ai_agents ?? [], usage_limits: t.usage_limits ?? {},
  default_subscription_plan: t.default_subscription_plan ?? '',
});

/* ════════════════════════════════════════════════════════════════════════════
   Main page
════════════════════════════════════════════════════════════════════════════ */
const TenantTemplatesPage: React.FC = () => {
  const isAr = useIsAr();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  usePageHeadingOverride({ hidden: true });

  const { data, loading, error, reload } = useAsync<TenantTemplate[]>(() => listTemplates(false), []);
  const catalog    = useAsync<ModuleCatalogEntry[]>(() => getModuleCatalog(), []);
  const frameworks = useAsync<string[]>(() => getFrameworkCodes(), []);

  const [busy,           setBusy]           = useState(false);
  const [editing,        setEditing]        = useState<TenantTemplate | 'new' | null>(null);
  const [search,         setSearch]         = useState('');
  const [tierFilter,     setTierFilter]     = useState('');
  const [archFilter,     setArchFilter]     = useState('');
  const [searchFocused,  setSearchFocused]  = useState(false);

  const rows = data ?? [];
  const filtered = useMemo(() => rows.filter((r) => {
    if (tierFilter && r.default_subscription_plan !== tierFilter) return false;
    if (archFilter && r.archetype !== archFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return r.name.toLowerCase().includes(q)
          || (r.description ?? '').toLowerCase().includes(q)
          || r.archetype.includes(q);
    }
    return true;
  }), [rows, tierFilter, archFilter, search]);

  const toggleActive = async (tmpl: TenantTemplate) => {
    setBusy(true);
    try { await updateTemplate(tmpl.id, { is_active: !tmpl.is_active }); await reload(); }
    finally { setBusy(false); }
  };

  const remove = async (tmpl: TenantTemplate) => {
    if (!window.confirm(tr(isAr, `Delete template "${tmpl.name}"?`, `حذف القالب "${tmpl.name}"؟`))) return;
    setBusy(true);
    try { await deleteTemplate(tmpl.id); await reload(); }
    finally { setBusy(false); }
  };

  /* ─── Per-theme tokens ──────────────────────────────────────────────── */
  const pageBg     = isDark ? '#091812'                    : '#F0F7F4';
  const heroBg     = isDark ? '#0d2e22'                    : TINT;
  const heroBd     = isDark ? 'rgba(255,255,255,0.07)'     : '#C2E4D8';
  const filterBg   = isDark ? '#0d1f18'                    : '#ffffff';
  const titleColor = isDark ? '#ffffff'                    : '#0F2E22';
  const subColor   = isDark ? 'rgba(255,255,255,0.60)'     : '#2A5C4A';
  const inputBg    = isDark ? 'rgba(255,255,255,0.04)'     : '#F7FCF9';
  const inputBd    = isDark ? 'rgba(255,255,255,0.12)'     : '#C2E4D8';
  const inputColor = isDark ? 'rgba(255,255,255,0.70)'     : '#0F2E22';
  const iconColor  = isDark ? 'rgba(255,255,255,0.28)'     : '#5A8270';

  /* search input: icon is on the LEFT now */
  const srchStyle: React.CSSProperties = {
    width: '100%', height: 38, borderRadius: 9, fontSize: 13,
    paddingTop: 0, paddingBottom: 0, paddingLeft: 36, paddingRight: 14,
    border: `1px solid ${searchFocused ? BRAND : inputBd}`,
    boxShadow: searchFocused ? '0 0 0 3px rgba(29,158,117,0.12)' : 'none',
    background: inputBg, color: inputColor, outline: 'none',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.14s, box-shadow 0.14s',
  };
  /* select: appearance none so custom chevron shows */
  const selStyle: React.CSSProperties = {
    height: 38, borderRadius: 9, fontSize: 13, paddingLeft: 10, paddingRight: 32,
    border: `1px solid ${inputBd}`,
    background: inputBg, color: inputColor, outline: 'none',
    minWidth: 140, cursor: 'pointer', appearance: 'none',
  };

  return (
    <PlatformOperatorGate>
      <div dir="ltr" style={{ minHeight: '100%', background: pageBg }}>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div style={{ background: heroBg, borderBottom: `1px solid ${heroBd}`, padding: '28px 26px 22px' }}>
          {/* Badge */}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: BRAND, marginBottom: 8 }}>
            Pianat Admin
          </div>
          {/* Title row: title LEFT · CTA RIGHT */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: titleColor, letterSpacing: '-0.01em' }}>
                {tr(isAr, 'Tenant Templates', 'قوالب الجهات')}
              </h1>
              <p style={{ margin: '5px 0 0', fontSize: 12, color: subColor }}>
                {tr(isAr,
                  'Pre-built configurations that pre-fill the provisioning wizard. Only active templates appear in step 1.',
                  'إعدادات جاهزة تملأ معالج الإنشاء. تظهر القوالب النشطة فقط في الخطوة الأولى.'
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditing('new')}
              style={{
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 9, border: 'none',
                background: BRAND, color: '#fff', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 3px 14px rgba(29,158,117,0.35)',
                transition: 'background 0.14s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = HOVER; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = BRAND; }}
            >
              <Plus size={15} />
              {tr(isAr, 'New template', 'قالب جديد')}
            </button>
          </div>
        </div>

        {/* ── Filter bar — LTR order: archetype → tier → search ────────── */}
        <div style={{
          background: filterBg, borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : '#E2EDE9'}`,
          padding: '10px 24px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {/* Archetype select */}
          <div style={{ position: 'relative' }}>
            <select style={selStyle} value={archFilter} onChange={(e) => setArchFilter(e.target.value)}>
              <option value="">{tr(isAr, 'All archetypes', 'كل الأنواع')}</option>
              {ARCHETYPES.map((a) => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
            <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: iconColor }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </div>

          {/* Tier select */}
          <div style={{ position: 'relative' }}>
            <select style={selStyle} value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
              <option value="">{tr(isAr, 'All tiers', 'كل الخطط')}</option>
              {['free', 'starter', 'pro', 'enterprise', 'custom'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <span style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: iconColor }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
            </span>
          </div>

          {/* Search (flex:1, icon on LEFT) */}
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{
              position: 'absolute', top: '50%', transform: 'translateY(-50%)',
              left: 12, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', color: iconColor,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              type="search"
              style={srchStyle}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tr(isAr, 'Search templates...', 'بحث في القوالب...')}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>

        {/* ── Card grid ────────────────────────────────────────────────── */}
        <div style={{ padding: '24px 32px' }}>
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {filtered.map((tmpl) => (
                <TemplateCard
                  key={tmpl.id}
                  template={tmpl}
                  isDark={isDark}
                  busy={busy}
                  isAr={isAr}
                  onEdit={() => setEditing(tmpl)}
                  onToggle={() => toggleActive(tmpl)}
                  onDelete={() => remove(tmpl)}
                />
              ))}
              <AddCard isDark={isDark} isAr={isAr} onClick={() => setEditing('new')} />
            </div>
          )}
        </div>
      </div>

      {editing && (
        <TemplateModal
          template={editing === 'new' ? null : editing}
          catalog={catalog.data ?? []}
          frameworks={frameworks.data ?? []}
          isAr={isAr}
          isDark={isDark}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await reload(); }}
        />
      )}
    </PlatformOperatorGate>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   TemplateCard
════════════════════════════════════════════════════════════════════════════ */
const TemplateCard: React.FC<{
  template: TenantTemplate;
  isDark: boolean; busy: boolean; isAr: boolean;
  onEdit: () => void; onToggle: () => void; onDelete: () => void;
}> = ({ template, isDark, busy, isAr, onEdit, onToggle, onDelete }) => {
  const [hovered, setHovered] = useState(false);

  const cardBg  = isDark ? '#0d1f18' : '#ffffff';
  const cardBd  = hovered
    ? isDark ? 'rgba(29,158,117,0.40)' : '#1D9E75'
    : isDark ? 'rgba(255,255,255,0.08)' : '#D4EBE1';
  const txtMain = isDark ? '#ffffff' : '#0F2E22';
  const txtDesc = isDark ? 'rgba(255,255,255,0.60)' : '#2A5C4A';
  const chipBg  = isDark ? 'rgba(29,158,117,0.12)' : TINT;
  const chipCl  = isDark ? ACCENT : '#085041';

  const plan = template.default_subscription_plan ?? '';
  const tier = tierMeta(plan, isDark);
  const mods = (template.enabled_modules ?? []).length;
  const fws  = (template.active_frameworks ?? []).length;
  const ags  = (template.enabled_ai_agents ?? []).length;

  return (
    <div
      style={{
        position: 'relative', borderRadius: 11,
        background: cardBg, border: `0.5px solid ${cardBd}`,
        paddingTop: 14, paddingRight: 14, paddingBottom: 14, paddingLeft: 48,
        opacity: template.is_active ? 1 : 0.62,
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hovered
          ? isDark ? '0 4px 20px rgba(0,0,0,0.40)' : '0 4px 16px rgba(0,0,0,0.08)'
          : 'none',
        transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Action column — physical left:12, top:12 */}
      <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Btn28 title={tr(isAr, 'Edit', 'تعديل')} disabled={busy}
          base={isDark ? 'rgba(29,158,117,0.07)' : 'rgba(29,158,117,0.07)'}
          bd={isDark ? 'rgba(29,158,117,0.30)' : '#A8D8C8'} color={BRAND}
          hover="rgba(29,158,117,0.16)" onClick={onEdit}>
          <Pencil size={13} />
        </Btn28>
        <Btn28 title={tr(isAr, 'Toggle active', 'تبديل الحالة')} disabled={busy}
          base={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}
          bd={isDark ? 'rgba(255,255,255,0.12)' : '#D4EBE1'}
          color={isDark ? 'rgba(255,255,255,0.55)' : '#5A8270'}
          hover={isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)'} onClick={onToggle}>
          <Power size={13} />
        </Btn28>
        <Btn28 title={tr(isAr, 'Delete', 'حذف')} disabled={busy}
          base={isDark ? 'rgba(224,112,112,0.07)' : 'rgba(224,112,112,0.06)'}
          bd={isDark ? 'rgba(224,112,112,0.25)' : '#EBBBBB'}
          color={isDark ? '#E07070' : '#C0392B'}
          hover="rgba(224,112,112,0.15)" onClick={onDelete}>
          <Trash2 size={13} />
        </Btn28>
      </div>

      {/* Card content — LEFT-aligned */}
      <div>
        {/* Name */}
        <div style={{ fontSize: 13.5, fontWeight: 700, color: txtMain, marginBottom: 4 }}>
          {template.name}
        </div>
        {/* Description — 2-line clamp */}
        {template.description && (
          <div style={{
            fontSize: 11.5, color: txtDesc, lineHeight: 1.5, marginBottom: 8,
            overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as any,
          }}>
            {template.description}
          </div>
        )}
        {/* Archetype slug */}
        <div style={{ fontSize: 11, fontWeight: 500, color: isDark ? BRAND : HOVER, marginBottom: 8 }}>
          {template.archetype.replace(/_/g, ' ')}
        </div>

        {/* Meta chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'flex-start', marginBottom: 8 }}>
          {[
            { n: mods, label: tr(isAr, 'module',    'وحدة') },
            { n: fws,  label: tr(isAr, 'framework', 'إطار') },
            { n: ags,  label: tr(isAr, 'agent',     'وكيل') },
          ].map(({ n, label }) => (
            <span key={label} style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: chipBg, color: chipCl }}>
              {n} {label}
            </span>
          ))}
        </div>

        {/* Tier badge */}
        {plan && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 999,
            background: tier.bg, border: `1px solid ${tier.bd}`, color: tier.color,
          }}>
            <Star size={10} fill="currentColor" strokeWidth={0} />
            {plan}
          </span>
        )}
      </div>
    </div>
  );
};

/* ─── 28px square action button ─────────────────────────────────────────── */
const Btn28: React.FC<{
  title: string; disabled: boolean; onClick: () => void;
  base: string; bd: string; color: string; hover: string;
  children: React.ReactNode;
}> = ({ title, disabled, onClick, base, bd, color, hover, children }) => (
  <button
    type="button" title={title} disabled={disabled} onClick={onClick}
    style={{
      width: 28, height: 28, borderRadius: 7, border: `1px solid ${bd}`,
      background: base, color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: disabled ? 'not-allowed' : 'pointer', flexShrink: 0, transition: 'background 0.12s',
    }}
    onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = hover; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = base; }}
  >
    {children}
  </button>
);

/* ─── Add-new placeholder card ───────────────────────────────────────────── */
const AddCard: React.FC<{ isDark: boolean; isAr: boolean; onClick: () => void }> = ({ isDark, isAr, onClick }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      type="button" onClick={onClick}
      style={{
        width: '100%', minHeight: 120, borderRadius: 11,
        border: `1.5px dashed ${BRAND}`, background: 'transparent',
        cursor: 'pointer', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8,
        opacity: hovered ? 0.80 : 0.48,
        transform: hovered ? 'translateY(-1px)' : 'translateY(0)',
        transition: 'opacity 0.14s, transform 0.14s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        width: 38, height: 38, borderRadius: '50%', color: BRAND,
        background: isDark ? 'rgba(29,158,117,0.15)' : 'rgba(29,158,117,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Plus size={18} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: BRAND }}>
        {tr(isAr, 'New template', 'قالب جديد')}
      </span>
    </button>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   TemplateModal
════════════════════════════════════════════════════════════════════════════ */
const TemplateModal: React.FC<{
  template: TenantTemplate | null;
  catalog: ModuleCatalogEntry[];
  frameworks: string[];
  isAr: boolean; isDark: boolean;
  onClose: () => void; onSaved: () => void;
}> = ({ template, catalog, frameworks, isAr, isDark, onClose, onSaved }) => {
  const [form, setForm] = useState<FormState>(template ? fromTemplate(template) : emptyForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const availMods = useMemo(
    () => catalog.filter((m) => m.available_for_archetypes.includes(form.archetype)),
    [catalog, form.archetype],
  );
  const toggle = (field: 'enabled_modules' | 'active_frameworks' | 'enabled_ai_agents', v: string) => {
    const cur = form[field];
    set({ [field]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as any);
  };

  const save = async () => {
    if (!form.name.trim()) { setError(tr(isAr, 'Name is required', 'الاسم مطلوب')); return; }
    setBusy(true); setError(null);
    const body = {
      name: form.name.trim(), description: form.description || undefined,
      archetype: form.archetype, enabled_modules: form.enabled_modules,
      active_frameworks: form.active_frameworks, enabled_ai_agents: form.enabled_ai_agents,
      usage_limits: form.usage_limits,
      default_subscription_plan: form.default_subscription_plan || undefined,
    };
    try {
      if (template) await updateTemplate(template.id, body);
      else await createTemplate(body);
      onSaved();
    } catch (e: any) {
      const issues = e?.payload?.issues;
      setError(
        Array.isArray(issues) && issues.length
          ? issues.map((i: any) => `${i.field}: ${i.message}`).join(' · ')
          : e?.message ?? 'Save failed',
      );
      setBusy(false);
    }
  };

  /* modal tokens */
  const mBg    = isDark ? '#0d1f18' : '#ffffff';
  const mBd    = isDark ? 'rgba(255,255,255,0.08)' : '#D4EBE1';
  const mTitle = isDark ? '#ffffff' : '#0F2E22';
  const mMuted = isDark ? 'rgba(255,255,255,0.55)' : '#5A8270';
  const ctrl: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', borderRadius: 8,
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#C2E4D8'}`,
    background: isDark ? 'rgba(0,0,0,0.22)' : '#F7FCF9',
    color: isDark ? '#ffffff' : '#0F2E22',
    padding: '8px 12px', fontSize: 13, outline: 'none',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1080, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', padding: 16 }}
      onClick={onClose}
    >
      <div
        dir="ltr"
        style={{ maxHeight: '90vh', width: 720, maxWidth: '95vw', overflowY: 'auto', borderRadius: 16, background: mBg, border: `1px solid ${mBd}`, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.45)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h5 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: mTitle }}>
            {template ? tr(isAr, 'Edit template', 'تعديل القالب') : tr(isAr, 'New template', 'قالب جديد')}
          </h5>
          <button type="button" onClick={onClose}
            style={{ borderRadius: '50%', padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: mMuted, display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: mMuted, marginBottom: 5 }}>
                {tr(isAr, 'Name', 'الاسم')} <span style={{ color: '#E24B4A' }}>*</span>
              </label>
              <input style={ctrl} value={form.name} onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: mMuted, marginBottom: 5 }}>{tr(isAr, 'Archetype', 'النوع')}</label>
              <select style={ctrl} value={form.archetype} onChange={(e) => set({ archetype: e.target.value, enabled_modules: [] })}>
                {ARCHETYPES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: mMuted, marginBottom: 5 }}>{tr(isAr, 'Description', 'الوصف')}</label>
            <input style={ctrl} value={form.description} onChange={(e) => set({ description: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: mMuted, marginBottom: 5 }}>{tr(isAr, 'Default plan', 'الخطة الافتراضية')}</label>
            <select style={ctrl} value={form.default_subscription_plan} onChange={(e) => set({ default_subscription_plan: e.target.value })}>
              {PLANS.map((p) => <option key={p} value={p}>{p || tr(isAr, '(none)', '(بدون)')}</option>)}
            </select>
          </div>

          <CheckGroup isDark={isDark} label={tr(isAr, 'Modules', 'الوحدات')} columns={2}
            items={availMods.map((m) => ({ value: m.module_key, label: isAr ? m.name_ar : m.name_en }))}
            selected={form.enabled_modules} onToggle={(v) => toggle('enabled_modules', v)} />

          <CheckGroup isDark={isDark} label={tr(isAr, 'Frameworks', 'الأطر')} columns={3}
            items={frameworks.map((f) => ({ value: f, label: f }))}
            selected={form.active_frameworks} onToggle={(v) => toggle('active_frameworks', v)} />

          <CheckGroup isDark={isDark} label={tr(isAr, 'AI agents', 'وكلاء الذكاء')} columns={2}
            items={AI_AGENTS.map((a) => ({ value: a, label: a.replace(/_/g, ' ') }))}
            selected={form.enabled_ai_agents} onToggle={(v) => toggle('enabled_ai_agents', v)} />

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: mMuted, marginBottom: 8 }}>{tr(isAr, 'Usage limits', 'حدود الاستخدام')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {LIMIT_KEYS.map((k) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, fontSize: 11, color: isDark ? 'rgba(255,255,255,0.45)' : '#5A8270' }}>
                    {k.replace(/_/g, ' ')}
                  </span>
                  <input type="number" min={0}
                    style={{ ...ctrl, width: 90, flex: 'none', padding: '6px 10px' }}
                    value={form.usage_limits[k] ?? ''}
                    placeholder="∞"
                    onChange={(e) => {
                      const next = { ...form.usage_limits };
                      if (e.target.value === '') delete next[k]; else next[k] = Number(e.target.value);
                      set({ usage_limits: next });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ borderRadius: 8, padding: '9px 12px', fontSize: 12, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.28)', color: '#ef4444' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: isAr ? 'flex-start' : 'flex-end', gap: 8, borderTop: `1px solid ${mBd}`, paddingTop: 14, marginTop: 2 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#C2E4D8'}`, background: 'transparent', color: isDark ? 'rgba(255,255,255,0.70)' : '#2A5C4A', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {tr(isAr, 'Cancel', 'إلغاء')}
            </button>
            <button type="button" disabled={busy} onClick={save}
              style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: BRAND, color: '#fff', fontSize: 13, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1, transition: 'background 0.14s' }}
              onMouseEnter={(e) => { if (!busy) e.currentTarget.style.background = HOVER; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = BRAND; }}>
              {busy ? tr(isAr, 'Saving…', 'جارٍ الحفظ…') : template ? tr(isAr, 'Save', 'حفظ') : tr(isAr, 'Create', 'إنشاء')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── CheckGroup ──────────────────────────────────────────────────────────── */
const CheckGroup: React.FC<{
  isDark: boolean; label: string; columns?: number;
  items: Array<{ value: string; label: string }>;
  selected: string[]; onToggle: (v: string) => void;
}> = ({ isDark, label, columns = 2, items, selected, onToggle }) => {
  const muted = isDark ? 'rgba(255,255,255,0.50)' : '#5A8270';
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: muted, marginBottom: 7 }}>
        {label} <span style={{ fontWeight: 400, opacity: 0.60 }}>({selected.length})</span>
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 4 }}>
        {items.map((it) => {
          const active = selected.includes(it.value);
          return (
            <label key={it.value} style={{
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              borderRadius: 7, padding: '5px 9px', fontSize: 12,
              border: `1px solid ${active ? BRAND : isDark ? 'rgba(255,255,255,0.08)' : '#D4EBE1'}`,
              background: active ? (isDark ? 'rgba(29,158,117,0.13)' : 'rgba(29,158,117,0.06)') : 'transparent',
              color: active ? (isDark ? ACCENT : HOVER) : isDark ? 'rgba(255,255,255,0.62)' : '#2A5C4A',
              transition: 'border-color 0.12s, background 0.12s',
            }}>
              <input type="checkbox" checked={active} onChange={() => onToggle(it.value)} style={{ accentColor: BRAND }} />
              {it.label}
            </label>
          );
        })}
        {items.length === 0 && <span style={{ fontSize: 11, color: muted, opacity: 0.55 }}>—</span>}
      </div>
    </div>
  );
};

export default TenantTemplatesPage;
