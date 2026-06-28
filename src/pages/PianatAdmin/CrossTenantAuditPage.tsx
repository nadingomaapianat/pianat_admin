/** Phase 3 — /pianat-admin/audit: cross-tenant audit log redesigned */
import React, { useMemo, useState } from 'react';
import { Building2, ChevronDown, Download, User } from 'lucide-react';
import { downloadAuditCsv, listCrossTenantAudit } from '../../services/pianatAdminServices';
import { PlatformOperatorGate, useAsync, useIsAr, tr, Loading, ErrorBox } from './common';
import { useTheme } from '../../context/ThemeContext';
import { usePageHeadingOverride } from '../../components/Layout/PageHeadingContext';

/* ─── Brand tokens ───────────────────────────────────────────────────────── */
const BRAND  = '#1D9E75';
const HOVER  = '#0F6E56';

/* ─── Action colour map ──────────────────────────────────────────────────── */
type ActionStyle = { bg: string; color: string };
const actionMeta = (action: string, isDark: boolean): ActionStyle => {
  const a = action.toLowerCase();
  if (a === 'create_tenant' || a.startsWith('create'))
    return isDark
      ? { bg: 'rgba(29,158,117,0.18)', color: '#5DCAA5' }
      : { bg: '#D1F5E5',               color: '#085041' };
  if (a === 'edit_tenant' || a === 'edit_data' || a === 'view_data' || a.startsWith('edit') || a.startsWith('view'))
    return isDark
      ? { bg: 'rgba(90,140,230,0.15)', color: '#7BAAF7' }
      : { bg: '#DDEEFF',               color: '#1A5FAB' };
  if (a === 'delete_tenant' || a.startsWith('delete') || a.startsWith('revoke'))
    return isDark
      ? { bg: 'rgba(220,80,80,0.15)',  color: '#E07070' }
      : { bg: '#FDEAEA',               color: '#A02020' };
  if (a === 'export' || a.startsWith('export'))
    return isDark
      ? { bg: 'rgba(180,120,30,0.15)', color: '#FAC775' }
      : { bg: '#FEF3DC',               color: '#8A5500' };
  if (a === 'impersonate' || a.startsWith('grant') || a === 'switch_tenant')
    return isDark
      ? { bg: 'rgba(140,80,200,0.15)', color: '#C49DF5' }
      : { bg: '#F0E8FD',               color: '#6B2FAE' };
  return isDark
    ? { bg: 'rgba(255,255,255,0.07)',  color: 'rgba(255,255,255,0.50)' }
    : { bg: '#E9EFF4',                  color: '#5A7080' };
};

const ACTIONS = [
  'create_tenant', 'edit_tenant', 'delete_tenant',
  'export', 'impersonate', 'view_data', 'edit_data', 'export_data',
  'grant_membership', 'revoke_membership', 'switch_tenant',
];

/* ════════════════════════════════════════════════════════════════════════════
   Page
════════════════════════════════════════════════════════════════════════════ */
const CrossTenantAuditPage: React.FC = () => {
  const isAr = useIsAr();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  usePageHeadingOverride({ hidden: true });

  const [action,      setAction]      = useState('');
  const [actorInput,  setActorInput]  = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [actor,       setActor]       = useState('');
  const [target,      setTarget]      = useState('');
  const [since,       setSince]       = useState('');
  const [until,       setUntil]       = useState('');
  const [page,        setPage]        = useState(1);

  /* focused state per field for green border ring */
  const [focused, setFocused] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsync(
    () => listCrossTenantAudit({ action: action || undefined, actor: actor || undefined, target: target || undefined, since: since || undefined, page }),
    [action, actor, target, since, page],
  );

  const allRows: any[] = data?.rows ?? [];
  const rows = useMemo(() => {
    if (!until) return allRows;
    const end = new Date(until + 'T23:59:59Z');
    return allRows.filter((r) => new Date(r.occurred_at) <= end);
  }, [allRows, until]);

  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 50;
  const pages = Math.max(1, Math.ceil(total / perPage));

  const applyText = () => { setActor(actorInput); setTarget(targetInput); setPage(1); };

  /* ─── Per-theme tokens ──────────────────────────────────────────────── */
  const pageBg    = isDark ? '#091812'                   : '#F0F7F4';
  const heroBg    = isDark ? '#0d2e22'                   : '#E1F5EE';
  const heroBd    = isDark ? 'rgba(255,255,255,0.07)'    : '#C2E4D8';
  const filterBg  = isDark ? '#0d1f18'                   : '#ffffff';
  const filterBd  = isDark ? 'rgba(255,255,255,0.08)'    : '#D4EBE1';
  const tableBg   = isDark ? '#091812'                   : '#ffffff';
  const titleClr  = isDark ? '#ffffff'                   : '#0F2E22';
  const descClr   = isDark ? 'rgba(255,255,255,0.55)'    : '#2A5C4A';
  const labelClr  = isDark ? 'rgba(255,255,255,0.82)'    : '#6B8C80';
  const textClr   = isDark ? '#ffffff'                   : '#0F2E22';
  const mutedClr  = isDark ? 'rgba(255,255,255,0.42)'    : '#6B8C80';
  const thBd      = isDark ? 'rgba(255,255,255,0.08)'    : '#D4EBE1';
  const rowBd     = isDark ? 'rgba(255,255,255,0.05)'    : '#EEF6F2';
  const rowHover  = isDark ? 'rgba(29,158,117,0.05)'     : 'rgba(29,158,117,0.04)';
  const inBg      = isDark ? 'rgba(0,0,0,0.22)'          : '#F7FCF9';
  const inBd      = isDark ? 'rgba(255,255,255,0.12)'    : '#C2E4D8';
  const inColor   = isDark ? '#ffffff'                   : '#0F2E22';
  const iconClr   = isDark ? 'rgba(255,255,255,0.28)'    : '#5A8270';
  const resBg     = isDark ? 'rgba(255,255,255,0.07)'    : '#E1F5EE';
  const resClr    = isDark ? 'rgba(255,255,255,0.50)'    : '#085041';
  const pgBd      = isDark ? 'rgba(255,255,255,0.08)'    : '#D4EBE1';
  const pgColor   = isDark ? 'rgba(255,255,255,0.60)'    : '#2A5C4A';

  /* Export CSV button */
  const expBd   = isDark ? 'rgba(255,255,255,0.18)' : BRAND;
  const expClr  = isDark ? 'rgba(255,255,255,0.75)' : HOVER;
  const expHover= isDark ? 'rgba(255,255,255,0.06)' : '#E1F5EE';

  const inputStyle = (field: string): React.CSSProperties => ({
    height: 36, borderRadius: 8, fontSize: 13,
    paddingTop: 0, paddingBottom: 0,
    paddingInlineStart: 34, paddingInlineEnd: 10,
    border: `1px solid ${focused === field ? BRAND : inBd}`,
    boxShadow: focused === field ? '0 0 0 3px rgba(29,158,117,0.12)' : 'none',
    background: inBg, color: inColor, outline: 'none',
    width: '100%', boxSizing: 'border-box' as const,
    transition: 'border-color 0.14s, box-shadow 0.14s',
  });

  const selectWrap: React.CSSProperties = { position: 'relative', width: 170 };
  const selectStyle: React.CSSProperties = {
    height: 36, width: '100%', borderRadius: 8, fontSize: 13,
    paddingInlineStart: 10, paddingInlineEnd: 30,
    border: `1px solid ${focused === 'action' ? BRAND : inBd}`,
    boxShadow: focused === 'action' ? '0 0 0 3px rgba(29,158,117,0.12)' : 'none',
    background: isDark ? '#0d1f18' : '#F7FCF9', color: inColor, outline: 'none',
    appearance: 'none' as const, cursor: 'pointer',
    transition: 'border-color 0.14s, box-shadow 0.14s',
  };

  const dateStyle = (field: string): React.CSSProperties => ({
    height: 36, borderRadius: 8, fontSize: 13,
    padding: '0 10px',
    border: `1px solid ${focused === field ? BRAND : inBd}`,
    boxShadow: focused === field ? '0 0 0 3px rgba(29,158,117,0.12)' : 'none',
    background: inBg, color: inColor, outline: 'none', cursor: 'pointer',
    colorScheme: isDark ? 'dark' : 'light',
    transition: 'border-color 0.14s, box-shadow 0.14s',
  } as React.CSSProperties);

  return (
    <PlatformOperatorGate>
      <div dir={isAr ? 'rtl' : 'ltr'} style={{ minHeight: '100%', background: pageBg }}>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div style={{ background: heroBg, borderBottom: `1px solid ${heroBd}`, padding: '28px 32px 22px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: BRAND, marginBottom: 8 }}>
            Pianat Admin
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 21, fontWeight: 600, color: titleClr, letterSpacing: '-0.01em' }}>
                {tr(isAr, 'Cross-tenant audit', 'تدقيق عبر الجهات')}
              </h1>
              <p style={{ margin: '5px 0 0', fontSize: 13, color: descClr, maxWidth: 520 }}>
                {tr(isAr,
                  'Every cross-tenant action — impersonation, edits, exports, membership changes, and tenant lifecycle events.',
                  'كل إجراء عبر الجهات — الانتحال والتعديلات والتصدير وتغييرات العضوية وأحداث دورة حياة الجهة.'
                )}
              </p>
            </div>
            {/* Export CSV — ghost button, top right */}
            <button
              type="button"
              onClick={() => downloadAuditCsv().catch((e) => alert(e?.message ?? 'Export failed'))}
              style={{
                flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
                border: `1px solid ${expBd}`, background: 'transparent', color: expClr,
                fontSize: 13, fontWeight: 600, transition: 'background 0.14s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = expHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Download size={14} />
              {tr(isAr, 'Export CSV', 'تصدير CSV')}
            </button>
          </div>
        </div>

        {/* ── Filter bar ───────────────────────────────────────────────── */}
        <div style={{
          background: filterBg, borderBottom: `1px solid ${filterBd}`,
          padding: '14px 32px',
          display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 16,
        }}>

          {/* Action — select with chevron */}
          <FilterGroup label={tr(isAr, 'ACTION', 'الإجراء')} labelColor={labelClr}>
            <div style={selectWrap}>
              <select
                style={selectStyle}
                value={action}
                onChange={(e) => { setAction(e.target.value); setPage(1); }}
                onFocus={() => setFocused('action')}
                onBlur={() => setFocused(null)}
              >
                <option value="">{tr(isAr, 'All actions', 'كل الإجراءات')}</option>
                {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', insetInlineEnd: 9, pointerEvents: 'none', color: iconClr }} />
            </div>
          </FilterGroup>

          {/* Actor — text input + user icon */}
          <FilterGroup label={tr(isAr, 'ACTOR', 'الفاعل')} labelColor={labelClr}>
            <div style={{ position: 'relative', width: 180 }}>
              <User size={13} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', insetInlineStart: 11, pointerEvents: 'none', color: iconClr }} />
              <input
                style={inputStyle('actor')}
                value={actorInput}
                onChange={(e) => setActorInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyText()}
                onBlur={() => { setFocused(null); applyText(); }}
                onFocus={() => setFocused('actor')}
                placeholder={tr(isAr, 'User name…', 'اسم المستخدم…')}
              />
            </div>
          </FilterGroup>

          {/* Target — text input + building icon */}
          <FilterGroup label={tr(isAr, 'TARGET', 'الهدف')} labelColor={labelClr}>
            <div style={{ position: 'relative', width: 180 }}>
              <Building2 size={13} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', insetInlineStart: 11, pointerEvents: 'none', color: iconClr }} />
              <input
                style={inputStyle('target')}
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyText()}
                onBlur={() => { setFocused(null); applyText(); }}
                onFocus={() => setFocused('target')}
                placeholder={tr(isAr, 'Tenant name…', 'اسم الجهة…')}
              />
            </div>
          </FilterGroup>

          {/* Date range */}
          <FilterGroup label={tr(isAr, 'DATE RANGE', 'نطاق التاريخ')} labelColor={labelClr}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="date" style={dateStyle('since')} value={since}
                onChange={(e) => { setSince(e.target.value); setPage(1); }}
                onFocus={() => setFocused('since')} onBlur={() => setFocused(null)} />
              <span style={{ fontSize: 12, color: mutedClr, flexShrink: 0 }}>→</span>
              <input type="date" style={dateStyle('until')} value={until}
                onChange={(e) => setUntil(e.target.value)}
                onFocus={() => setFocused('until')} onBlur={() => setFocused(null)} />
            </div>
          </FilterGroup>

        </div>

        {/* ── Audit table ──────────────────────────────────────────────── */}
        <div style={{ padding: '0 0 32px' }}>
          {loading ? (
            <div style={{ padding: '32px' }}><Loading /></div>
          ) : error ? (
            <div style={{ padding: '32px' }}><ErrorBox message={error} onRetry={reload} /></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: tableBg, fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${thBd}` }}>
                    {[
                      tr(isAr, 'WHEN', 'الوقت'),
                      tr(isAr, 'ACTION', 'الإجراء'),
                      tr(isAr, 'ACTOR', 'الفاعل'),
                      tr(isAr, 'TARGET', 'الهدف'),
                      tr(isAr, 'RESOURCE', 'المورد'),
                    ].map((h) => (
                      <th key={h} style={{
                        padding: '10px 20px', textAlign: 'start',
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        color: labelClr,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r: any) => (
                    <AuditRow
                      key={r.id}
                      row={r}
                      isDark={isDark}
                      isAr={isAr}
                      textClr={textClr}
                      mutedClr={mutedClr}
                      rowBd={rowBd}
                      rowHover={rowHover}
                      resBg={resBg}
                      resClr={resClr}
                    />
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '48px 20px', textAlign: 'center', color: mutedClr, fontSize: 13 }}>
                        {tr(isAr, 'No audit entries found.', 'لا سجلات تدقيق.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && pages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
              padding: '12px 32px', borderTop: `1px solid ${pgBd}`,
            }}>
              <PgBtn disabled={page <= 1} isDark={isDark} onClick={() => setPage((p) => p - 1)}>
                {tr(isAr, '← Prev', 'السابق ←')}
              </PgBtn>
              <span style={{ fontSize: 12, color: pgColor, minWidth: 60, textAlign: 'center' }}>
                {page} / {pages}
              </span>
              <PgBtn disabled={page >= pages} isDark={isDark} onClick={() => setPage((p) => p + 1)}>
                {tr(isAr, 'Next →', '→ التالي')}
              </PgBtn>
            </div>
          )}
        </div>

      </div>
    </PlatformOperatorGate>
  );
};

/* ─── AuditRow (isolated to avoid re-render thrashing on hover) ──────────── */
const AuditRow: React.FC<{
  row: any; isDark: boolean; isAr: boolean;
  textClr: string; mutedClr: string; rowBd: string; rowHover: string;
  resBg: string; resClr: string;
}> = ({ row, isDark, isAr, textClr, mutedClr, rowBd, rowHover, resBg, resClr }) => {
  const [hovered, setHovered] = useState(false);
  const badge = actionMeta(row.action ?? '', isDark);

  const d = new Date(row.occurred_at);
  const datePart = d.toLocaleDateString(isAr ? 'ar' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const timePart = d.toLocaleTimeString(isAr ? 'ar' : 'en-US', { hour: '2-digit', minute: '2-digit' });

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
      {/* WHEN */}
      <td style={{ padding: '11px 20px', whiteSpace: 'nowrap' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: textClr }}>{datePart}</div>
        <div style={{ fontSize: 11, color: mutedClr, marginTop: 2 }}>{timePart}</div>
      </td>

      {/* ACTION */}
      <td style={{ padding: '11px 20px' }}>
        <span style={{
          display: 'inline-block', padding: '3px 9px', borderRadius: 6,
          fontSize: 11.5, fontWeight: 600,
          background: badge.bg, color: badge.color,
          whiteSpace: 'nowrap',
        }}>
          {row.action ?? '—'}
        </span>
      </td>

      {/* ACTOR */}
      <td style={{ padding: '11px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: textClr }}>
          {row.actor_name ?? row.actor_user_id ?? '—'}
        </div>
        {(row.actor_tenant_name) && (
          <div style={{ fontSize: 11, color: mutedClr, marginTop: 2 }}>{row.actor_tenant_name}</div>
        )}
      </td>

      {/* TARGET */}
      <td style={{ padding: '11px 20px', color: textClr, fontSize: 13 }}>
        {row.target_tenant_name ?? row.target_tenant_id ?? '—'}
      </td>

      {/* RESOURCE */}
      <td style={{ padding: '11px 20px' }}>
        {row.resource_type ? (
          <span style={{
            display: 'inline-block', padding: '2px 9px', borderRadius: 99,
            fontSize: 11, fontWeight: 500,
            background: resBg, color: resClr, whiteSpace: 'nowrap',
          }}>
            {row.resource_type}
          </span>
        ) : (
          <span style={{ color: mutedClr, fontSize: 12 }}>—</span>
        )}
      </td>
    </tr>
  );
};

/* ─── FilterGroup: label + control stacked ───────────────────────────────── */
const FilterGroup: React.FC<{ label: string; labelColor: string; children: React.ReactNode }> = ({ label, labelColor, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: labelColor }}>
      {label}
    </span>
    {children}
  </div>
);

/* ─── Pagination button ───────────────────────────────────────────────────── */
const PgBtn: React.FC<{ disabled: boolean; isDark: boolean; onClick: () => void; children: React.ReactNode }> = ({ disabled, isDark, onClick, children }) => {
  const bd   = isDark ? 'rgba(255,255,255,0.12)' : '#C2E4D8';
  const bg   = 'transparent';
  const clr  = isDark ? 'rgba(255,255,255,0.60)' : '#2A5C4A';
  const hBg  = isDark ? 'rgba(255,255,255,0.07)' : '#E1F5EE';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
        border: `1px solid ${bd}`, background: bg, color: clr, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.40 : 1, transition: 'background 0.13s',
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = hBg; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = bg; }}
    >
      {children}
    </button>
  );
};

export default CrossTenantAuditPage;
