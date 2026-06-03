/** Pianat Admin login — POST /auth/loginDemo, store Bearer token, gate to platform_operator. */
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api, { setToken, clearToken } from '../services/apiClient';
import { capabilitiesFor } from '../types/rootEntity';

const SHIELD_LOGO = '/assets/images/Shield Icon green.svg';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reason = params.get('reason');
  const [tenantSlug, setTenantSlug] = useState('pianat');
  const [username, setUsername] = useState('pianat_admin');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-emerald-50 p-4">
      <form onSubmit={submit} className="w-[400px] max-w-[95vw] rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <div className="mb-4 flex items-center gap-3">
          <img src={SHIELD_LOGO} alt="Comply.now" className="h-11 w-11" />
          <div>
            <div className="text-base font-bold">Comply.now</div>
            <div className="text-xs text-slate-500">Pianat Admin console</div>
          </div>
        </div>

        {reason === 'expired' && (
          <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Session expired — please sign in again.</div>
        )}
        {reason === 'forbidden' && (
          <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">That account is not a platform operator.</div>
        )}

        <label className="form-label">Organization</label>
        <input className="form-control mb-3" value={tenantSlug} onChange={(e) => setTenantSlug(e.target.value)} placeholder="pianat" />

        <label className="form-label">Username</label>
        <input className="form-control mb-3" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="pianat_admin" />

        <label className="form-label">Password</label>
        <input type="password" className="form-control mb-3" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

        {error && <div className="mb-3 text-sm text-rose-600">{error}</div>}

        <button type="submit" className="btn btn-success w-100" disabled={busy || !tenantSlug || !username || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
};

export default Login;
