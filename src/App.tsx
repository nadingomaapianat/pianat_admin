import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, LayoutDashboard, FileText, DollarSign, LogOut, Languages, Sun, Moon } from 'lucide-react';
import { TenantProvider, useTenant } from './context/TenantContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { clearToken, getToken } from './services/apiClient';

// The Comply.now wordmark shown when the sidebar is open in the original app.
// It's a white logo, so it sits on a dark branded badge to stay legible.
const COMPLY_LOGO = '/assets/images/2nd Logo Light.svg';

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

const TopBar: React.FC = () => {
  const { currentTenant } = useTenant();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
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
    <div className="sticky top-0 z-50 flex items-center gap-1 border-b border-slate-200 bg-white px-4 py-2 shadow-sm">
      <div className="me-3 flex items-center gap-2">
        <span className="flex items-center rounded-lg bg-slate-900 px-3 py-1.5 dark:bg-slate-950">
          <img src={COMPLY_LOGO} alt="Comply.now" className="h-5 w-auto" />
        </span>
        <span className="hidden text-sm font-semibold text-slate-500 sm:inline dark:text-slate-400">Admin</span>
      </div>
      <nav className="flex flex-1 flex-wrap items-center gap-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
                isActive ? 'bg-emerald-50 font-semibold text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
              }`
            }
          >
            <Icon size={15} /> {label}
          </NavLink>
        ))}
      </nav>
      <span className="me-1 hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline-flex dark:bg-slate-800 dark:text-slate-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        {currentTenant?.username ?? currentTenant?.name}
      </span>
      <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60">
        <button
          className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-amber-500 hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-amber-300"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          className="flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-white hover:text-emerald-600 hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-emerald-300"
          title="Change language"
          onClick={toggleLang}
        >
          <Languages size={15} />
          {isAr ? 'AR' : 'EN'}
        </button>
        <button
          className="grid h-8 w-8 place-items-center rounded-full text-slate-500 transition-colors hover:bg-white hover:text-rose-600 hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-rose-400"
          title="Sign out"
          onClick={logout}
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <TopBar />
    <Suspense fallback={null}>{children}</Suspense>
  </>
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
