import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TenantProvider } from './context/TenantContext';
import { ThemeProvider } from './context/ThemeContext';
import { getToken } from './services/apiClient';
import Sidebar from './components/Layout/Sidebar';
import ChatWidget from './components/ChatWidget';

import Login from './pages/Login';
import TenantManagementPage from './pages/PianatAdmin/TenantManagementPage';
import TenantProvisioningWizard from './pages/PianatAdmin/TenantProvisioningWizard';
import TenantConfigDetailPage from './pages/PianatAdmin/TenantConfigDetailPage';
import TenantTemplatesPage from './pages/PianatAdmin/TenantTemplatesPage';
import CrossTenantAuditPage from './pages/PianatAdmin/CrossTenantAuditPage';
import PlatformMetricsPage from './pages/PianatAdmin/PlatformMetricsPage';
import BillingPage from './pages/PianatAdmin/BillingPage';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  return (
    <div className={`flex h-screen overflow-hidden ${isAr ? 'flex-row-reverse' : ''}`}>
      <Sidebar />
      <div className="min-w-0 flex-1 overflow-y-auto">
        <Suspense fallback={null}>{children}</Suspense>
      </div>
      <ChatWidget context="admin" />
    </div>
  );
};

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
