import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, LayoutDashboard, FileText, DollarSign, LogOut, Languages, Sun, Moon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { TenantProvider, useTenant } from './context/TenantContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { clearToken, getToken } from './services/apiClient';
import ChatWidget from './components/ChatWidget';
import COMPLY_LOGO from '../Full Logo light.svg';

import Login from './pages/Login';
import TenantManagementPage from './pages/PianatAdmin/TenantManagementPage';
import TenantProvisioningWizard from './pages/PianatAdmin/TenantProvisioningWizard';
import TenantConfigDetailPage from './pages/PianatAdmin/TenantConfigDetailPage';
import TenantTemplatesPage from './pages/PianatAdmin/TenantTemplatesPage';
import CrossTenantAuditPage from './pages/PianatAdmin/CrossTenantAuditPage';
import PlatformMetricsPage from './pages/PianatAdmin/PlatformMetricsPage';
import BillingPage from './pages/PianatAdmin/BillingPage';

// Routes are mounted under /pianat-admin/* to match the links inside the
// ported pages (they navigate to /pianat-admin/tenants/:id etc. unchanged).
const NAV = [
  { to: '/pianat-admin/tenants', label: 'Tenants', icon: Building2 },
  { to: '/pianat-admin/tenant-templates', label: 'Templates', icon: FileText },
  { to: '/pianat-admin/audit', label: 'Cross-tenant audit', icon: FileText },
  { to: '/pianat-admin/metrics', label: 'Platform metrics', icon: LayoutDashboard },
  { to: '/pianat-admin/billing', label: 'Billing', icon: DollarSign },
];

/** Compact mark shown when the sidebar is collapsed (served from public/). */
const COMPLY_MARK = '/assets/images/Shield Icon green.svg';

const Sidebar: React.FC = () => {
  const { currentTenant } = useTenant();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const [collapsed, setCollapsed] = React.useState<boolean>(
    () => localStorage.getItem('pa_sidebar_collapsed') === '1',
  );
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem('pa_sidebar_collapsed', next ? '1' : '0');
      return next;
    });
  };
  const toggleLang = () => {
    const next = i18n.language?.startsWith('ar') ? 'en' : 'ar';
    localStorage.setItem('pa_lang', next);
    i18n.changeLanguage(next);
  };
  const logout = () => {
    clearToken();
    window.dispatchEvent(new Event('pa:auth-changed'));
    navigate('/login', { replace: true });
  };
  return (
    <aside
      className={`sticky top-0 h-screen shrink-0 border-r border-white/10 bg-gradient-to-b from-slate-950 via-slate-950 to-emerald-950 p-3 transition-[width] duration-200 ${
        collapsed ? 'w-[76px]' : 'w-[280px]'
      }`}
    >
      <div className="flex h-full flex-col">
        {/* Logo + collapse toggle — the logo swaps between full wordmark
            (open) and compact mark (collapsed). */}
        <div className="mb-4 pt-2">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <img src={COMPLY_MARK} alt="Comply.now" className="logo-img h-8 w-8" />
              <button
                className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                title="Expand sidebar"
                aria-label="Expand sidebar"
                onClick={toggleCollapsed}
              >
                <PanelLeftOpen size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2 px-1">
              <div className="min-w-0">
                <img src={COMPLY_LOGO} alt="Comply.now" className="logo-img h-7 w-auto" />
                <div className="mt-2 text-xs font-semibold text-white/70">Pianat Admin</div>
              </div>
              <button
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                onClick={toggleCollapsed}
              >
                <PanelLeftClose size={16} />
              </button>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl py-2 text-sm transition-colors ${
                  collapsed ? 'justify-center px-0' : 'px-3'
                } ${
                  isActive
                    ? 'bg-white/10 font-semibold text-white'
                    : 'text-white/75 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-2 shadow-sm">
          {!collapsed && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-white/85">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
              <span className="truncate">{currentTenant?.username ?? currentTenant?.name ?? 'Signed in'}</span>
            </div>
          )}
          <div className={`flex items-center gap-1 ${collapsed ? 'flex-col' : ''}`}>
            <button
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              className={`flex h-9 items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white ${
                collapsed ? 'w-9' : 'flex-1 px-2'
              }`}
              title="Change language"
              onClick={toggleLang}
            >
              <Languages size={15} />
              {!collapsed && (isAr ? 'AR' : 'EN')}
            </button>
            <button
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition-colors hover:bg-white/10 hover:text-rose-300"
              title="Sign out"
              onClick={logout}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-screen">
    <Sidebar />
    <div className="min-w-0 flex-1">
      <Suspense fallback={null}>{children}</Suspense>
    </div>
    <ChatWidget context="admin" />
  </div>
);

/** Guard for the whole authenticated area — no token → login. */
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <Shell>{children}</Shell>;
};

const App: React.FC = () => (
  <ThemeProvider>
  <TenantProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/pianat-admin/tenants" element={<RequireAuth><TenantManagementPage /></RequireAuth>} />
        <Route path="/pianat-admin/tenants/new" element={<RequireAuth><TenantProvisioningWizard /></RequireAuth>} />
        <Route path="/pianat-admin/tenants/:id" element={<RequireAuth><TenantConfigDetailPage /></RequireAuth>} />
        <Route path="/pianat-admin/tenant-templates" element={<RequireAuth><TenantTemplatesPage /></RequireAuth>} />
        <Route path="/pianat-admin/audit" element={<RequireAuth><CrossTenantAuditPage /></RequireAuth>} />
        <Route path="/pianat-admin/metrics" element={<RequireAuth><PlatformMetricsPage /></RequireAuth>} />
        <Route path="/pianat-admin/billing" element={<RequireAuth><BillingPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/pianat-admin/tenants" replace />} />
      </Routes>
    </BrowserRouter>
  </TenantProvider>
  </ThemeProvider>
);

export default App;
