/** Phase 3 — /pianat-admin/tenants: tenant list redesign */
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, Building, Landmark, ChevronDown } from 'lucide-react';
import { listTenants, TenantListRow } from '../../services/pianatAdminServices';
import { PlatformOperatorGate, useAsync, useIsAr, tr, Loading, ErrorBox } from './common';
import { useTheme } from '../../context/ThemeContext';
import { usePageHeadingOverride } from '../../components/Layout/PageHeadingContext';

/* ─── Brand tokens ────────────────────────────────────────────────────────── */
const BRAND  = '#1D9E75';
const HOVER  = '#0F6E56';
const ACCENT = '#5DCAA5';
const TINT   = '#E1F5EE';

const ARCHETYPES = ['client', 'consulting_firm', 'audit_firm', 'regulator', 'platform_operator'];
const ARCH_LABEL: Record<string, string> = {
  client:            'Client',
  consulting_firm:   'Consulting Firm',
  audit_firm:        'Audit Firm',
  regulator:         'Regulator',
  platform_operator: 'Platform Operator',
};

const pickIcon = (archetype: string) => {
  if (archetype === 'consulting_firm' || archetype === 'audit_firm') return Landmark;
  if (archetype === 'regulator') return Building;
  return Building2;
};

/* ════════════════════════════════════════════════════════════════════════════
   Page
════════════════════════════════════════════════════════════════════════════ */
const TenantManagementPage: React.FC = () => {
  const isAr = useIsAr();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  usePageHeadingOverride({ hidden: true });

  const [archetype, setArchetype]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch]           = useState('');
  const [query, setQuery]             = useState('');
  const [page, setPage]               = useState(1);

  /* ── Data ─────────────────────────────────────────────────────────────── */
  const { data: statsData } = useAsync<any>(
    () => listTenants({ perPage: 9999 }),
    [],
  );
  const { data, loading, error, reload } = useAsync<any>(
    () => listTenants({ archetype: archetype || undefined, search: query || undefined, page }),
    [archetype, query, page],
  );

  /* ── Stats (from unfiltered full set) ────────────────────────────────── */
  const statsRows: TenantListRow[] = statsData?.rows ?? [];
  const statsTotal    = statsData?.total ?? 0;
  const statsActive   = statsRows.filter((r) => r.is_active).length;
  const statsInactive = statsRows.filter((r) => !r.is_active).length;
  const statsClient   = statsRows.filter(
    (r) => r.tenant_type === 'client' || r.archetype === 'client',
  ).length;
  const statsPartner  = statsRows.filter(
    (r) => r.tenant_type === 'partner' || ['consulting_firm', 'audit_firm'].includes(r.archetype),
  ).length;

  /* ── Table rows — status filter applied client-side ──────────────────── */
  const tableRows = useMemo<TenantListRow[]>(() => {
    const rows: TenantListRow[] = data?.rows ?? [];
    if (!statusFilter) return rows;
    return rows.filter((r) => r.is_active === (statusFilter === 'active'));
  }, [data?.rows, statusFilter]);

  const total  = data?.total ?? 0;
  const perPage = data?.per_page ?? 25;
  const pages  = Math.max(1, Math.ceil(total / perPage));

  /* ── Per-theme tokens ────────────────────────────────────────────────── */
  const pageBg   = isDark ? '#091812'                    : '#F0F7F4';
  const heroBg   = isDark ? '#0d2e22'                    : TINT;
  const heroBd   = isDark ? 'rgba(255,255,255,0.07)'     : '#C2E4D8';
  const stripBg  = isDark ? '#091812'                    : '#ffffff';
  const stripBd  = isDark ? 'rgba(255,255,255,0.06)'     : '#E2EDE9';
  const filterBg = isDark ? '#0d1f18'                    : '#ffffff';
  const filterBd = isDark ? 'rgba(255,255,255,0.07)'     : '#E2EDE9';
  const tblBg    = isDark ? '#0d1f18'                    : '#ffffff';
  const titleClr = isDark ? '#ffffff'                    : '#0F2E22';
  const descClr  = isDark ? 'rgba(255,255,255,0.55)'     : '#2A5C4A';
  const thLbl    = isDark ? 'rgba(255,255,255,0.82)'     : '#6B8C80';
  const thBd     = isDark ? 'rgba(255,255,255,0.08)'     : '#D4EBE1';
  const rowBd    = isDark ? 'rgba(255,255,255,0.05)'     : '#EEF6F2';
  const rowHov   = isDark ? 'rgba(29,158,117,0.05)'      : 'rgba(29,158,117,0.04)';
  const inCtrl   = isDark ? 'rgba(255,255,255,0.12)'     : '#C2E4D8';
  const inBg     = isDark ? 'rgba(255,255,255,0.04)'     : '#F7FCF9';
  const inTxt    = isDark ? 'rgba(255,255,255,0.70)'     : '#0F2E22';
  const lblClr   = isDark ? 'rgba(255,255,255,0.82)'     : '#6B8C80';
  const mutedClr = isDark ? 'rgba(255,255,255,0.35)'     : '#6B8C80';
  const pgBg     = isDark ? '#0d1f18'                    : '#ffffff';
  const pgBd     = isDark ? 'rgba(255,255,255,0.08)'     : '#D4EBE1';
  const pgTxt    = isDark ? 'rgba(255,255,255,0.55)'     : '#6B8C80';

  const applySearch = () => { setQuery(search); setPage(1); };

  return (
    <PlatformOperatorGate>
      <div dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100%', background: pageBg }}>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <div style={{ background: heroBg, borderBottom: `1px solid ${heroBd}`, padding: '28px 26px 22px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: BRAND, marginBottom: 8 }}>
            Pianat Admin
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: titleClr, letterSpacing: '-0.01em' }}>
                {tr(isAr, 'Tenants', 'الجهات')}
              </h1>
              <p style={{ margin: '5px 0 0', fontSize: 12.5, color: descClr }}>
                {tr(isAr, 'Every organization on the platform.', 'كل المنظمات على المنصة.')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/pianat-admin/tenants/new')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 9, border: 'none',
                background: BRAND, color: '#ffffff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                transition: 'background 0.14s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = HOVER; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = BRAND; }}
            >
              <Plus size={15} />
              {tr(isAr, 'Create tenant', 'إنشاء جهة')}
            </button>
          </div>
        </div>

        {/* ── Stats strip ────────────────────────────────────────────────── */}
        <div style={{ background: stripBg, borderBottom: `1px solid ${stripBd}`, padding: '12px 26px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            <StatCard isDark={isDark} label={tr(isAr, 'Total tenants', 'إجمالي الجهات')} value={String(statsTotal)} />
            <StatCard isDark={isDark} label={tr(isAr, 'Active', 'نشطة')} value={String(statsActive)} kind="active" />
            <StatCard isDark={isDark} label={tr(isAr, 'Inactive', 'غير نشطة')} value={String(statsInactive)} kind="inactive" />
            <StatCard isDark={isDark} label={tr(isAr, 'Client type', 'نوع عميل')} value={String(statsClient)} />
            <StatCard isDark={isDark} label={tr(isAr, 'Partner type', 'نوع شريك')} value={String(statsPartner)} />
          </div>
        </div>

        {/* ── Filter bar ─────────────────────────────────────────────────── */}
        <div style={{ background: filterBg, borderBottom: `1px solid ${filterBd}`, padding: '12px 26px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>

            <FilterGroup label={tr(isAr, 'SEARCH', 'بحث')} grow lblClr={lblClr}>
              <SearchBox
                value={search}
                onChange={setSearch}
                onApply={applySearch}
                inCtrl={inCtrl} inBg={inBg} inTxt={inTxt}
                placeholder={tr(isAr, 'Search tenants…', 'ابحث عن جهة…')}
              />
            </FilterGroup>

            <FilterGroup label={tr(isAr, 'ARCHETYPE', 'النوع')} lblClr={lblClr}>
              <DropSelect
                value={archetype}
                onChange={(v) => { setArchetype(v); setPage(1); }}
                inCtrl={inCtrl} inBg={inBg} inTxt={inTxt}
              >
                <option value="">{tr(isAr, 'All', 'الكل')}</option>
                {ARCHETYPES.map((a) => (
                  <option key={a} value={a}>{ARCH_LABEL[a] ?? a}</option>
                ))}
              </DropSelect>
            </FilterGroup>

            <FilterGroup label={tr(isAr, 'STATUS', 'الحالة')} lblClr={lblClr}>
              <DropSelect
                value={statusFilter}
                onChange={(v) => { setStatusFilter(v); setPage(1); }}
                inCtrl={inCtrl} inBg={inBg} inTxt={inTxt}
              >
                <option value="">{tr(isAr, 'All', 'الكل')}</option>
                <option value="active">{tr(isAr, 'Active', 'نشطة')}</option>
                <option value="inactive">{tr(isAr, 'Inactive', 'غير نشطة')}</option>
              </DropSelect>
            </FilterGroup>

          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        <div style={{ padding: '14px 26px 24px', background: pageBg }}>
          {loading ? (
            <Loading />
          ) : error ? (
            <ErrorBox message={error} onRetry={reload} />
          ) : (
            <div style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${thBd}` }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', background: tblBg, fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${thBd}` }}>
                      {([
                        { label: tr(isAr, 'ORGANIZATION', 'المنظمة'), align: 'start', w: undefined },
                        { label: tr(isAr, 'ARCHETYPE', 'النوع'),      align: 'start', w: 160 },
                        { label: tr(isAr, 'USERS', 'المستخدمون'),     align: 'center', w: 80 },
                        { label: tr(isAr, 'STATUS', 'الحالة'),        align: 'start', w: 120 },
                        { label: '',                                   align: 'end',   w: 110 },
                      ] as const).map((h, i) => (
                        <th key={i} style={{
                          padding: '10px 18px', textAlign: h.align as any,
                          fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
                          textTransform: 'uppercase', color: thLbl,
                          ...(h.w ? { width: h.w } : {}),
                        }}>
                          {h.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row) => (
                      <TenantRow
                        key={row.id}
                        row={row}
                        isDark={isDark}
                        isAr={isAr}
                        rowBd={rowBd}
                        rowHov={rowHov}
                        titleClr={titleClr}
                        mutedClr={mutedClr}
                        onNavigate={() => navigate(`/pianat-admin/tenants/${row.id}`)}
                      />
                    ))}
                    {tableRows.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ padding: '48px 18px', textAlign: 'center', color: mutedClr, fontSize: 13 }}>
                          {tr(isAr, 'No tenants found.', 'لا توجد جهات.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {pages > 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 18px', borderTop: `1px solid ${thBd}`, background: pgBg,
                }}>
                  <span style={{ fontSize: 12, color: pgTxt }}>
                    {total} {tr(isAr, 'tenants', 'جهة')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PgBtn
                      onClick={() => setPage((p) => p - 1)} disabled={page <= 1}
                      isDark={isDark} pgBd={pgBd} pgTxt={pgTxt}
                      label={tr(isAr, 'Prev', 'السابق')}
                    />
                    <span style={{ fontSize: 12, color: pgTxt, padding: '0 6px' }}>{page} / {pages}</span>
                    <PgBtn
                      onClick={() => setPage((p) => p + 1)} disabled={page >= pages}
                      isDark={isDark} pgBd={pgBd} pgTxt={pgTxt}
                      label={tr(isAr, 'Next', 'التالي')}
                    />
                  </div>
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
   StatCard
════════════════════════════════════════════════════════════════════════════ */
const StatCard: React.FC<{
  isDark: boolean;
  label: string;
  value: string;
  kind?: 'active' | 'inactive';
}> = ({ isDark, label, value, kind }) => {
  const valClr = kind === 'active'
    ? isDark ? BRAND : HOVER
    : kind === 'inactive'
      ? isDark ? 'rgba(255,255,255,0.30)' : '#A3BFB7'
      : isDark ? '#ffffff' : '#0F2E22';

  const bg  = isDark ? '#0d1f18' : '#F7FCF9';
  const bd  = isDark ? 'rgba(255,255,255,0.08)' : '#D4EBE1';
  const lbl = isDark ? 'rgba(255,255,255,0.42)' : '#6B8C80';

  return (
    <div style={{ borderRadius: 9, border: `1px solid ${bd}`, background: bg, padding: '12px 16px' }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: valClr, lineHeight: 1, marginBottom: 5 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: lbl, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   FilterGroup
════════════════════════════════════════════════════════════════════════════ */
const FilterGroup: React.FC<{
  label: string;
  children: React.ReactNode;
  grow?: boolean;
  lblClr: string;
}> = ({ label, children, grow, lblClr }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...(grow ? { flex: 1 } : {}) }}>
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: lblClr }}>
      {label}
    </span>
    {children}
  </div>
);

/* ════════════════════════════════════════════════════════════════════════════
   SearchBox
════════════════════════════════════════════════════════════════════════════ */
const SearchBox: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onApply: () => void;
  inCtrl: string; inBg: string; inTxt: string;
  placeholder: string;
}> = ({ value, onChange, onApply, inCtrl, inBg, inTxt, placeholder }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <Search size={14} style={{
        position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)',
        color: inTxt, opacity: 0.45, pointerEvents: 'none',
      }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onApply()}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{
          width: '100%', height: 36, paddingInlineStart: 34, paddingInlineEnd: 12,
          borderRadius: 8, border: `1px solid ${focused ? BRAND : inCtrl}`,
          background: inBg, color: inTxt, fontSize: 13, outline: 'none', boxSizing: 'border-box',
          boxShadow: focused ? '0 0 0 3px rgba(29,158,117,0.12)' : 'none',
          transition: 'border-color 0.14s, box-shadow 0.14s',
        }}
      />
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   DropSelect
════════════════════════════════════════════════════════════════════════════ */
const DropSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  inCtrl: string; inBg: string; inTxt: string;
}> = ({ value, onChange, children, inCtrl, inBg, inTxt }) => (
  <div style={{ position: 'relative' }}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%', height: 36, paddingInlineStart: 10, paddingInlineEnd: 32,
        borderRadius: 8, border: `1px solid ${inCtrl}`,
        background: inBg, color: inTxt, fontSize: 13, outline: 'none',
        appearance: 'none', cursor: 'pointer',
      }}
    >
      {children}
    </select>
    <ChevronDown size={13} style={{
      position: 'absolute', insetInlineEnd: 9, top: '50%', transform: 'translateY(-50%)',
      color: inTxt, opacity: 0.45, pointerEvents: 'none',
    }} />
  </div>
);

/* ════════════════════════════════════════════════════════════════════════════
   TenantRow — isolated hover state
════════════════════════════════════════════════════════════════════════════ */
const TenantRow: React.FC<{
  row: TenantListRow; isDark: boolean; isAr: boolean;
  rowBd: string; rowHov: string; titleClr: string; mutedClr: string;
  onNavigate: () => void;
}> = ({ row, isDark, isAr, rowBd, rowHov, titleClr, mutedClr, onNavigate }) => {
  const [hovered, setHovered]   = useState(false);
  const [btnHov, setBtnHov]     = useState(false);

  const AvatarIcon = pickIcon(row.archetype);

  const avatarBg = row.is_active
    ? isDark ? 'rgba(29,158,117,0.12)' : '#E1F5EE'
    : isDark ? 'rgba(255,255,255,0.05)' : '#EEF6F2';
  const avatarBd = row.is_active
    ? isDark ? 'rgba(29,158,117,0.25)' : '#C2E4D8'
    : isDark ? 'rgba(255,255,255,0.08)' : '#D4EBE1';
  const avatarIco = row.is_active
    ? isDark ? BRAND : HOVER
    : isDark ? 'rgba(255,255,255,0.30)' : '#A3BFB7';

  const dotClr  = row.is_active ? BRAND : isDark ? 'rgba(255,255,255,0.25)' : '#C2E4D8';
  const statLbl = row.is_active ? (isDark ? ACCENT : HOVER) : mutedClr;

  const archBg  = isDark ? 'rgba(29,158,117,0.12)' : '#E1F5EE';
  const archClr = isDark ? ACCENT : '#085041';

  const btnBd    = isDark ? 'rgba(29,158,117,0.4)' : BRAND;
  const btnClr   = isDark ? BRAND : HOVER;
  const btnHovBg = isDark ? 'rgba(29,158,117,0.12)' : TINT;

  const name = isAr && row.name_ar ? row.name_ar : row.name;

  return (
    <tr
      style={{
        borderBottom: `1px solid ${rowBd}`,
        background: hovered ? rowHov : 'transparent',
        transition: 'background 0.12s',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onNavigate}
    >
      {/* ORGANIZATION */}
      <td style={{ padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: avatarBg, border: `1px solid ${avatarBd}`,
          }}>
            <AvatarIcon size={16} color={avatarIco} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: titleClr, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {name}
            </div>
            <div style={{ fontSize: 11, color: mutedClr, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.slug}
            </div>
          </div>
        </div>
      </td>

      {/* ARCHETYPE */}
      <td style={{ padding: '12px 18px' }}>
        <span style={{
          fontSize: 11.5, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
          background: archBg, color: archClr,
        }}>
          {ARCH_LABEL[row.archetype] ?? row.archetype}
        </span>
      </td>

      {/* USERS */}
      <td style={{ padding: '12px 18px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: titleClr }}>
        {row.users}
      </td>

      {/* STATUS */}
      <td style={{ padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotClr, flexShrink: 0, display: 'inline-block' }} />
          <span style={{ fontSize: 12.5, color: statLbl, fontWeight: 500 }}>
            {row.is_active ? tr(isAr, 'Active', 'نشطة') : tr(isAr, 'Inactive', 'غير نشطة')}
          </span>
        </div>
      </td>

      {/* ACTION */}
      <td
        style={{ padding: '12px 18px', textAlign: 'end' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onNavigate}
          style={{
            fontSize: 12.5, fontWeight: 600, padding: '6px 14px', borderRadius: 8,
            border: `0.5px solid ${btnBd}`,
            background: btnHov ? btnHovBg : 'transparent',
            color: btnClr, cursor: 'pointer', transition: 'background 0.14s',
          }}
          onMouseEnter={(e) => { e.stopPropagation(); setBtnHov(true); }}
          onMouseLeave={(e) => { e.stopPropagation(); setBtnHov(false); }}
        >
          {tr(isAr, 'Manage', 'إدارة')}
        </button>
      </td>
    </tr>
  );
};

/* ════════════════════════════════════════════════════════════════════════════
   PgBtn
════════════════════════════════════════════════════════════════════════════ */
const PgBtn: React.FC<{
  onClick: () => void; disabled: boolean;
  isDark: boolean; pgBd: string; pgTxt: string; label: string;
}> = ({ onClick, disabled, isDark, pgBd, pgTxt, label }) => {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 7,
        border: `1px solid ${pgBd}`,
        background: hov && !disabled ? (isDark ? 'rgba(255,255,255,0.05)' : TINT) : 'transparent',
        color: disabled ? (isDark ? 'rgba(255,255,255,0.20)' : '#C2D8D0') : pgTxt,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.12s',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {label}
    </button>
  );
};

export default TenantManagementPage;
