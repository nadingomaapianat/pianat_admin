/** Pianat Admin login — POST /auth/loginDemo */
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { AlertTriangle, Building2, Eye, EyeOff, Languages, Lock, Mail, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api, { setToken, clearToken } from '../services/apiClient';
import { useTheme } from '../context/ThemeContext';
import { capabilitiesFor } from '../types/rootEntity';
import COMPLY_LOGO_LIGHT from '../../Full Logo light.svg';

/* ─── Brand palette ─────────────────────────────────────────────────────── */
const BRAND  = '#1D9E75';
const HOVER  = '#0F6E56';
const ACCENT = '#5DCAA5';
const TINT   = '#E1F5EE';

/* ─── Shield SVG — double concentric rings + checkmark ───────────────────── */
const Shield: React.FC<{ size?: number; color: string; ring: string }> = ({ size = 172, color, ring }) => (
  <svg width={size} height={size} viewBox="0 0 200 220" fill="none">
    {/* outer dashed ring */}
    <circle cx="100" cy="110" r="96" stroke={ring} strokeWidth="1" strokeDasharray="5 7" opacity="0.25" />
    {/* inner solid ring */}
    <circle cx="100" cy="110" r="76" stroke={ring} strokeWidth="1.5" opacity="0.40" />
    {/* shield body */}
    <path
      d="M100 34C123 52 146 51 168 55L168 118C168 158 145 180 100 200C55 180 32 158 32 118L32 55C54 51 77 52 100 34Z"
      fill={`${color}1A`} stroke={color} strokeWidth="2"
    />
    {/* checkmark */}
    <path d="M70 112L89 131L132 82" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ─── Main component ─────────────────────────────────────────────────────── */
const Login: React.FC = () => {
  const navigate    = useNavigate();
  const [params]    = useSearchParams();
  const reason      = params.get('reason');
  const { theme, toggle: toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const isAr  = i18n.language?.startsWith('ar');
  const isDark = theme === 'dark';

  const [tenantSlug, setTenantSlug] = useState('pianat');
  const [credential, setCredential] = useState('');
  const [password,   setPassword]   = useState('');
  const [showPwd,    setShowPwd]    = useState(false);
  const [busy,       setBusy]       = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [focused,    setFocused]    = useState<string | null>(null);

  const toggleLang = () => {
    const next = isAr ? 'en' : 'ar';
    localStorage.setItem('pa_lang', next);
    i18n.changeLanguage(next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const res = await api.post<any>('/auth/loginDemo', { tenantSlug, credential, password });
      const accessToken = res?.token?.accessToken ?? res?.accessToken;
      if (!accessToken) throw new Error(t('login_err_no_token'));
      const claims: any = jwtDecode(accessToken);
      if (!capabilitiesFor(claims?.archetype).canManageAllTenants) {
        clearToken();
        throw new Error(t('login_err_operator_only'));
      }
      setToken(accessToken);
      window.dispatchEvent(new Event('pa:auth-changed'));
      navigate('/pianat-admin/tenants', { replace: true });
    } catch (err: any) {
      setError(err?.message ?? t('login_err_failed'));
    } finally { setBusy(false); }
  };

  const canSubmit = !busy && !!tenantSlug && !!credential && !!password;

  /* ─── Theme tokens ────────────────────────────────────────────────────── */
  // Form panel
  const fBg         = isDark ? '#0d1f18'                : '#ffffff';
  const fInputBg    = isDark ? 'rgba(0,0,0,0.22)'       : '#F7FCF9';
  const fInputBd    = isDark ? 'rgba(255,255,255,0.12)'  : '#C2E4D8';
  const fInputColor = isDark ? '#ffffff'                 : '#0F2E22';
  const fLabel      = isDark ? 'rgba(255,255,255,0.72)'  : '#2A5C4A';
  const fMuted      = isDark ? 'rgba(255,255,255,0.38)'  : '#5A8270';
  const fTitle      = isDark ? '#ffffff'                 : '#0F2E22';
  const fIcon       = isDark ? 'rgba(255,255,255,0.28)'  : '#5A8270';
  const fDivider    = isDark ? 'rgba(255,255,255,0.09)'  : '#C2E4D8';
  const fChipBd     = isDark ? 'rgba(255,255,255,0.14)'  : '#C2E4D8';
  const fChipBg     = isDark ? 'rgba(255,255,255,0.07)'  : '#F7FCF9';
  const fChipColor  = isDark ? 'rgba(255,255,255,0.80)'  : '#0F2E22';
  const alertBg     = isDark ? 'rgba(186,117,23,0.12)'   : '#FAEEDA';
  const alertBd     = isDark ? 'rgba(186,117,23,0.35)'   : '#F5C97A';
  const alertTxt    = isDark ? '#FAC775'                 : '#7A4500';

  // Brand panel
  const bGrad    = isDark
    ? 'linear-gradient(140deg, #0d2e22 0%, #091812 100%)'
    : 'linear-gradient(140deg, #CBF0DF 0%, #D8EFE5 100%)';
  const bTitle   = isDark ? '#ffffff'                  : '#0F2E22';
  const bSub     = isDark ? 'rgba(255,255,255,0.50)'   : '#2A5C4A';
  const bTag     = isDark ? ACCENT                     : HOVER;
  const bRing    = isDark ? ACCENT                     : BRAND;
  const bChipBd  = isDark ? 'rgba(255,255,255,0.14)'   : 'rgba(15,110,86,0.25)';
  const bChipBg  = isDark ? 'rgba(255,255,255,0.07)'   : 'rgba(29,158,117,0.08)';
  const bChipClr = isDark ? 'rgba(255,255,255,0.80)'   : HOVER;

  /* ─── Helper styles ───────────────────────────────────────────────────── */
  const inp = (field: string): React.CSSProperties => ({
    width: '100%', boxSizing: 'border-box', borderRadius: 10,
    border: `1px solid ${focused === field ? BRAND : fInputBd}`,
    boxShadow: focused === field ? '0 0 0 3px rgba(29,158,117,0.15)' : 'none',
    paddingTop: 11, paddingBottom: 11,
    paddingInlineStart: 40, paddingInlineEnd: field === 'pwd' ? 40 : 14,
    background: fInputBg, color: fInputColor,
    fontSize: 14, outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  });

  const iconAt: React.CSSProperties = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    insetInlineStart: 13, pointerEvents: 'none',
    display: 'flex', alignItems: 'center',
  };

  const pill = (bd: string, bg: string, cl: string): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 999,
    border: `1px solid ${bd}`, background: bg, color: cl,
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
  });

  const circle = (bd: string, bg: string, cl: string): React.CSSProperties => ({
    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
    border: `1px solid ${bd}`, background: bg, color: cl,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  });

  return (
    /* Root: always ltr so columns never flip (RTL applied per panel) */
    <div dir="ltr" style={{ position: 'relative', display: 'grid', gridTemplateColumns: '46fr 54fr', minHeight: '100vh', overflow: 'hidden' }}>

      {/* Single top bar spanning the full page — one theme + one lang button */}
      <div style={{ position: 'absolute', top: 18, left: 18, right: 18, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button type="button" onClick={toggleTheme} style={circle(fChipBd, fChipBg, fChipColor)}
          title={isDark ? t('login_switch_light') : t('login_switch_dark')}>
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button type="button" onClick={toggleLang} style={pill(bChipBd, bChipBg, bChipClr)}>
          <Languages size={13} />
          <span>{isAr ? 'ع' : 'EN'}</span>
          <span style={{ opacity: 0.28 }}>|</span>
          <span style={{ opacity: 0.48 }}>{isAr ? 'EN' : 'ع'}</span>
        </button>
      </div>

      {/* ══ FORM PANEL — left 46% ════════════════════════════════════════ */}
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        style={{
          position: 'relative', background: fBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '80px 40px 40px',
        }}
      >

        {/* Card */}
        <div style={{ width: '100%', maxWidth: 400 }}>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: fTitle, letterSpacing: '-0.02em' }}>
              {t('login_title')}
            </h2>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: fMuted }}>
              {t('login_subtitle')}
            </p>
          </div>

          {/* Alerts */}
          {reason === 'expired' && (
            <div style={{ marginBottom: 20, borderRadius: 10, padding: '11px 14px', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 9,
              background: alertBg, border: `1px solid ${alertBd}`, color: alertTxt }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              {t('login_expired')}
            </div>
          )}
          {reason === 'forbidden' && (
            <div style={{ marginBottom: 20, borderRadius: 10, padding: '11px 14px', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 9,
              background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.28)', color: '#ef4444' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              {t('login_forbidden_msg')}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Organization */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: fLabel, marginBottom: 7 }}>
                {t('login_org_label')}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={iconAt}><Building2 size={15} color={fIcon} /></span>
                <input style={inp('org')} value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  placeholder={t('login_org_placeholder')} autoComplete="organization"
                  onFocus={() => setFocused('org')} onBlur={() => setFocused(null)} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: fLabel, marginBottom: 7 }}>
                {t('login_email_label')}
                <span style={{ color: '#E24B4A', marginInlineStart: 3 }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={iconAt}><Mail size={15} color={fIcon} /></span>
                <input style={inp('email')} value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  placeholder={t('login_email_placeholder')} autoComplete="username"
                  onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: fLabel, marginBottom: 7 }}>
                {t('login_password_label')}
                <span style={{ color: '#E24B4A', marginInlineStart: 3 }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <span style={iconAt}><Lock size={15} color={fIcon} /></span>
                <input
                  type={showPwd ? 'text' : 'password'}
                  style={inp('pwd')} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login_password_placeholder')} autoComplete="current-password"
                  onFocus={() => setFocused('pwd')} onBlur={() => setFocused(null)}
                />
                <button type="button" onClick={() => setShowPwd((v) => !v)}
                  style={{
                    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                    insetInlineEnd: 12, background: 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    color: fIcon, padding: 2,
                  }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember · Forgot */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: fMuted, cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: BRAND, width: 14, height: 14 }} />
                {t('login_remember')}
              </label>
              <a href="#" style={{ fontSize: 13, color: BRAND, textDecoration: 'none', fontWeight: 600 }}>
                {t('login_forgot')}
              </a>
            </div>

            {/* Error */}
            {error && (
              <div style={{ borderRadius: 10, padding: '11px 14px', fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 9,
                background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.28)', color: '#ef4444' }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* Login CTA */}
            <button
              type="submit" disabled={!canSubmit}
              style={{
                width: '100%', borderRadius: 10, padding: '13px 20px', marginTop: 4,
                fontSize: 15, fontWeight: 700, border: 'none',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                background: canSubmit ? BRAND : 'rgba(29,158,117,0.35)',
                color: '#ffffff',
                boxShadow: canSubmit ? '0 4px 18px rgba(29,158,117,0.36)' : 'none',
                opacity: canSubmit ? 1 : 0.65,
                transition: 'background 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => { if (canSubmit) e.currentTarget.style.background = HOVER; }}
              onMouseLeave={(e) => { if (canSubmit) e.currentTarget.style.background = BRAND; }}
            >
              {busy ? t('login_signing_in') : t('login_submit')}
            </button>

            {/* "أو" divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: fDivider }} />
              <span style={{ fontSize: 12, color: fMuted }}>{isAr ? 'أو' : 'or'}</span>
              <div style={{ flex: 1, height: 1, background: fDivider }} />
            </div>

            {/* Register ghost */}
            <button
              type="button"
              style={{
                width: '100%', borderRadius: 10, padding: '12px 20px',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                background: 'transparent',
                border: `1px solid ${BRAND}`,
                color: isDark ? ACCENT : HOVER,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? 'rgba(29,158,117,0.10)' : TINT; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {t('login_register')}
            </button>

          </form>
        </div>
      </div>

      {/* ══ BRAND PANEL — right 54% ══════════════════════════════════════ */}
      <div
        dir="ltr"
        style={{
          position: 'relative', background: bGrad,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '80px 48px 48px', overflow: 'hidden',
        }}
      >
        {/* Radial glow behind shield */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -55%)',
          width: 480, height: 480, borderRadius: '50%', pointerEvents: 'none',
          background: isDark
            ? 'radial-gradient(circle, rgba(29,158,117,0.18) 0%, transparent 65%)'
            : 'radial-gradient(circle, rgba(29,158,117,0.10) 0%, transparent 65%)',
        }} />

        {/* Centered brand content */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18, maxWidth: 380 }}>

          {/* Shield */}
          <Shield color={BRAND} ring={bRing} size={180} />

          {/* Logo */}
          <img
            src={isDark ? COMPLY_LOGO_LIGHT : '/assets/images/Full Logo Dark.png'}
            alt="Comply.now"
            style={{ maxWidth: 164, height: 'auto', objectFit: 'contain', marginTop: -6 }}
          />

          {/* "PIANAT ADMIN" uppercase tag */}
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: bTag,
          }}>
            Pianat Admin
          </span>

          {/* Headline + underline accent */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <h1 style={{
              margin: 0, fontSize: 38, fontWeight: 900,
              letterSpacing: '-0.025em', lineHeight: 1.08, color: bTitle,
            }}>
              {t('login_welcome_title')}
            </h1>
            {/* 3px green underline, 44px wide */}
            <div style={{ width: 44, height: 3, borderRadius: 99, background: BRAND }} />
          </div>

          {/* Description */}
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.80, color: bSub, maxWidth: 310 }}>
            {t('login_welcome_desc')}
          </p>
        </div>
      </div>

    </div>
  );
};

export default Login;
