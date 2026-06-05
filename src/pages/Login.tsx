/** Pianat Admin login — POST /auth/loginDemo, store Bearer token, gate to platform_operator. */
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api, { setToken, clearToken } from '../services/apiClient';
import { useTheme } from '../context/ThemeContext';
import { capabilitiesFor } from '../types/rootEntity';
import COMPLY_LOGO from '../../Full Logo light.svg';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reason = params.get('reason');
  const { theme, toggle: toggleTheme } = useTheme();
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith('ar');
  const [tenantSlug, setTenantSlug] = useState('pianat');
  const [username, setUsername] = useState('pianat_admin');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleLang = () => {
    const next = i18n.language?.startsWith('ar') ? 'en' : 'ar';
    localStorage.setItem('pa_lang', next);
    i18n.changeLanguage(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // loginDemo returns { isSuccess, data: { token: { accessToken } }, message }.
      const res = await api.post<any>('/auth/loginDemo', { tenantSlug, username, password });
      const accessToken = res?.token?.accessToken ?? res?.accessToken;
      if (!accessToken) throw new Error('No token returned');
      // Only platform_operator may use this console.
      const claims: any = jwtDecode(accessToken);
      if (!capabilitiesFor(claims?.archetype).canManageAllTenants) {
        clearToken();
        throw new Error('This console is for Pianat platform operators only.');
      }
      setToken(accessToken);
      window.dispatchEvent(new Event('pa:auth-changed'));
      navigate('/pianat-admin/tenants', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="auth-left">
        <div className="auth-topbar">
          <button type="button" onClick={toggleLang} className="auth-chip" title="Switch language">
            {isAr ? 'العربية' : 'English'}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            className="auth-chip"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
        <div className="auth-left-inner">
          <img src={COMPLY_LOGO} alt="Comply.now" className="logo-img h-10 w-auto" />
          <div className="mt-2 text-sm text-white/70">Nice to see you again</div>
          <div className="text-4xl font-extrabold tracking-tight">WELCOME BACK</div>
          <div className="max-w-md text-sm text-white/70">
            Platform operator console for tenant provisioning, templates, metrics, and audit.
          </div>
        </div>
      </div>

      <div className="auth-right">
        <form onSubmit={submit} className="auth-form">
          <h2>Login Account</h2>
          <p>Please enter your credentials to access your account</p>

          {reason === 'expired' && (
            <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Session expired — please sign in again.</div>
          )}
          {reason === 'forbidden' && (
            <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">That account is not a platform operator.</div>
          )}

          <label className="form-label">Organization</label>
          <input className="form-control mb-3" value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="Tenant slug" autoComplete="organization" />

          <label className="form-label">Username</label>
          <input className="form-control mb-3" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter your username" autoComplete="username" />

          <label className="form-label">Password</label>
          <input type="password" className="form-control mb-3" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" />

          <div className="mb-3 d-flex justify-content-between align-items-center">
            <label className="d-flex align-items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <input type="checkbox" />
              Remember me
            </label>
            <a href="#" className="text-xs" style={{ color: 'var(--brand)' }}>
              Forgot password
            </a>
          </div>

          {error && <div className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

          <button type="submit" className="btn btn-success w-100" disabled={busy || !tenantSlug || !username || !password}>
            {busy ? 'Signing in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
