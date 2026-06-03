/**
 * Shared shell + access gate for the Pianat Admin app.
 * Frontend gate mirrors the backend @PlatformOperatorOnly: only the
 * platform_operator archetype may use these pages. Server is authoritative.
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTenant } from '../../context/TenantContext';
import { capabilitiesFor } from '../../types/rootEntity';
import { usePageHeadingOverride } from '../../components/Layout/PageHeadingContext';
import { useIsAr, tr } from '../TenantAdmin/common';

export { useIsAr, tr, useAsync, Loading, ErrorBox, Panel } from '../TenantAdmin/common';

/**
 * Header action-button styles — compact, white with a thin gray border
 * (default) or brand-green-filled (primary). Unified to the Comply.now green.
 */
export const headerBtn =
  'inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 ' +
  'text-xs font-medium text-slate-800 no-underline transition hover:bg-slate-100 disabled:opacity-60';
export const headerBtnPrimary =
  'inline-flex items-center gap-1.5 rounded-md border border-emerald-700 bg-emerald-600 px-3 py-1.5 ' +
  'text-xs font-medium text-white no-underline transition hover:bg-emerald-700 disabled:opacity-60';

/** Wrap a Pianat page; redirects non-operators to login. */
export const PlatformOperatorGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentTenant, isLoading } = useTenant();
  if (isLoading && !currentTenant) return null;
  if (!currentTenant) return <Navigate to="/login" replace />;
  if (!capabilitiesFor(currentTenant.archetype).canManageAllTenants) {
    return <Navigate to="/login?reason=forbidden" replace />;
  }
  return <>{children}</>;
};

export const PianatShell: React.FC<{
  titleEn: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}> = ({ titleEn, titleAr, subtitleEn, subtitleAr, actions, children }) => {
  const isAr = useIsAr();
  usePageHeadingOverride({ hidden: true });
  return (
    <PlatformOperatorGate>
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 px-6 py-6"
      >
        <div className="rounded-3xl bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 p-6 text-white shadow-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-white/80">
                {tr(isAr, 'Pianat Admin', 'إدارة بيانات')}
              </div>
              <h1 className="mt-1 text-2xl font-bold md:text-3xl">{tr(isAr, titleEn, titleAr)}</h1>
              {(subtitleEn || subtitleAr) && (
                <p className="mt-1 max-w-2xl text-white/90">
                  {tr(isAr, subtitleEn ?? '', subtitleAr ?? '')}
                </p>
              )}
            </div>
            {actions}
          </div>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </PlatformOperatorGate>
  );
};
