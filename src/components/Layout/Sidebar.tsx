import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Building2, LayoutDashboard, FileText, DollarSign,
  LogOut, Languages, Sun, Moon, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTenant } from '../../context/TenantContext';
import { useTheme } from '../../context/ThemeContext';
import { clearToken } from '../../services/apiClient';
import COMPLY_LOGO_LIGHT from '../../../2nd Logo Light.svg';

const COMPLY_LOGO_DARK = '/assets/images/Full Logo Dark.png';
const COMPLY_MARK = '/assets/images/Shield Icon green.svg';

const NAV = [
  { to: '/pianat-admin/tenants',          en: 'Tenants',            ar: 'الجهات',                 icon: Building2 },
  { to: '/pianat-admin/tenant-templates', en: 'Templates',          ar: 'القوالب',                icon: FileText },
  { to: '/pianat-admin/audit',            en: 'Cross-tenant audit', ar: 'تدقيق متعدد الجهات',     icon: FileText },
  { to: '/pianat-admin/metrics',          en: 'Platform metrics',   ar: 'مقاييس المنصة',           icon: LayoutDashboard },
  { to: '/pianat-admin/billing',          en: 'Billing',            ar: 'الفواتير',               icon: DollarSign },
];

function getInitials(name?: string | null): string {
  const safe = (name ?? '').trim();
  if (!safe) return 'PA';
  const parts = safe.split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? 'P'}${parts[1]?.[0] ?? parts[0]?.[1] ?? 'A'}`.toUpperCase();
}

/* ─── Shared button class strings (Tailwind arbitrary CSS-var values) ─────── */
const iconBtn =
  'grid place-items-center rounded-xl transition-colors ' +
  'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] ' +
  'hover:bg-[var(--surface-hover)] hover:text-[var(--text-strong)]';

const logoutBtn =
  'grid place-items-center rounded-xl transition-colors ' +
  'border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] ' +
  'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/20 dark:hover:text-rose-300';

/* ─── Active / inactive nav link classes ──────────────────────────────────── */
const navActive =
  'bg-[var(--surface-hover)] text-[var(--brand)] font-semibold';
const navInactive =
  'text-[var(--text)] hover:bg-[var(--surface-2)] hover:text-[var(--text-strong)]';

const Sidebar: React.FC = () => {
  const { currentTenant } = useTenant();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');

  const [collapsed, setCollapsed] = React.useState<boolean>(
    () => localStorage.getItem('pa_sidebar') === 'collapsed',
  );

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem('pa_sidebar', next ? 'collapsed' : 'expanded'); } catch { /* */ }
      return next;
    });
  };

  const toggleLang = () => {
    const next = isAr ? 'en' : 'ar';
    localStorage.setItem('pa_lang', next);
    i18n.changeLanguage(next);
  };

  const logout = () => {
    clearToken();
    window.dispatchEvent(new Event('pa:auth-changed'));
    navigate('/login', { replace: true });
  };

  const themeTitle = theme === 'dark'
    ? (isAr ? 'التبديل إلى الوضع الفاتح' : 'Switch to light mode')
    : (isAr ? 'التبديل إلى الوضع الداكن' : 'Switch to dark mode');

  return (
    <aside
      dir={isAr ? 'rtl' : 'ltr'}
      className={`h-full shrink-0 flex flex-col transition-[width] duration-200 bg-[var(--surface)] ${
        collapsed ? 'w-[72px] p-2' : 'w-[256px] p-3'
      }`}
      style={{ borderInlineEnd: '1px solid var(--border)' }}
    >
      {/* ── Logo + collapse toggle ────────────────────────────────────── */}
      <div className={collapsed ? 'mb-3 px-1 pt-1' : 'mb-4 px-1 pt-1'}>
        <div className="flex items-center justify-between">
          <div className={collapsed ? 'flex w-full items-center justify-center' : ''}>
            {collapsed ? (
              <img src={COMPLY_MARK} alt="logo" className="h-8 w-8" />
            ) : (
              <img
                src={theme === 'light' ? COMPLY_LOGO_DARK : COMPLY_LOGO_LIGHT}
                alt="Comply.now"
                className="h-auto w-full object-contain"
                style={{ maxHeight: '40px' }}
              />
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              onClick={toggleCollapsed}
              className={`${iconBtn} h-8 w-8`}
              title={isAr ? 'طي القائمة' : 'Collapse sidebar'}
            >
              {isAr ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            </button>
          )}
        </div>

        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            className={`mt-2 w-full py-2 ${iconBtn}`}
            title={isAr ? 'توسيع القائمة' : 'Expand sidebar'}
          >
            {isAr ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
          </button>
        ) : (
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-[var(--brand)]">
            {isAr ? 'إدارة بيانات' : 'Pianat Admin'}
          </p>
        )}
      </div>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'none' }}>
        {NAV.map(({ to, en, ar, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? (isAr ? ar : en) : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-xl text-sm transition-colors ${
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2'
              } ${isActive ? navActive : navInactive}`
            }
          >
            <Icon size={16} className="shrink-0" />
            {!collapsed && <span className="truncate">{isAr ? ar : en}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── Bottom user card ─────────────────────────────────────────── */}
      <div
        className="mt-3 rounded-2xl p-2"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
      >
        {collapsed ? (
          /* Collapsed: vertical stack */
          <div className="grid gap-1">
            <div className="grid place-items-center rounded-xl py-2 bg-[var(--surface-hover)]">
              <div
                className="grid h-8 w-8 place-items-center rounded-xl text-xs font-bold"
                style={{ background: 'var(--brand-tint)', color: 'var(--brand)' }}
              >
                {getInitials(currentTenant?.username ?? currentTenant?.name)}
              </div>
            </div>
            <button className={`${iconBtn} h-8 w-full`} title={themeTitle} onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button
              className="flex h-8 w-full items-center justify-center gap-1 rounded-xl border text-[10px] font-bold transition-colors hover:bg-[var(--surface-hover)]"
              style={{ borderColor: 'var(--brand)', background: 'var(--brand-tint)', color: 'var(--brand)' }}
              title={isAr ? 'تغيير اللغة' : 'Change language'}
              onClick={toggleLang}
            >
              {isAr ? 'ع' : 'EN'}
            </button>
            <button
              className={`${logoutBtn} h-8 w-full`}
              title={isAr ? 'تسجيل الخروج' : 'Sign out'}
              onClick={logout}
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          /* Expanded: user row + action buttons */
          <>
            <div
              className="mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold"
              style={{ background: 'var(--surface-hover)', color: 'var(--text-strong)' }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: 'var(--brand)' }}
              />
              <span className="truncate">
                {currentTenant?.username ?? currentTenant?.name ?? (isAr ? 'مسجل الدخول' : 'Signed in')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button className={`${iconBtn} h-9 w-9`} title={themeTitle} onClick={toggleTheme}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition-colors hover:bg-[var(--surface-hover)]"
                style={{ borderColor: 'var(--brand)', background: 'var(--brand-tint)' }}
                title={isAr ? 'تغيير اللغة' : 'Change language'}
                onClick={toggleLang}
              >
                <Languages size={13} style={{ color: 'var(--brand)' }} />
                <span style={{ color: 'var(--brand)' }}>{isAr ? 'ع' : 'EN'}</span>
                <span style={{ color: 'var(--text-faint)' }}>|</span>
                <span style={{ color: 'var(--text-muted)' }}>{isAr ? 'EN' : 'ع'}</span>
              </button>
              <button
                className={`${logoutBtn} h-9 w-9`}
                title={isAr ? 'تسجيل الخروج' : 'Sign out'}
                onClick={logout}
              >
                <LogOut size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
