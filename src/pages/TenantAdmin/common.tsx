/**
 * Shared helpers (ported from the customer app). Bilingual + RTL-aware via the
 * inline `tr(isAr, en, ar)` helper. Pianat Admin pages re-export these through
 * PianatAdmin/common.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function useIsAr(): boolean {
  const { i18n } = useTranslation();
  return Boolean(i18n.language?.startsWith('ar'));
}

export const tr = (isAr: boolean, en: string, ar: string) => (isAr ? ar : en);

export function useAsync<T>(fn: () => Promise<T>, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fn());
    } catch (e: any) {
      setError(e?.message ?? 'Request failed');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}

export const Panel: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <div className={`rounded-2xl bg-white p-5 shadow ring-1 ring-slate-200 ${className ?? ''}`}>
    {children}
  </div>
);

export const Loading: React.FC = () => {
  const isAr = useIsAr();
  return (
    <Panel className="text-center text-slate-500">
      <span className="spinner-border spinner-border-sm me-2" />
      {tr(isAr, 'Loading…', 'جارٍ التحميل…')}
    </Panel>
  );
};

export const ErrorBox: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => {
  const isAr = useIsAr();
  return (
    <Panel className="border border-rose-200 bg-rose-50 text-rose-700">
      <div>{message}</div>
      {onRetry && (
        <button className="btn btn-sm btn-outline-danger mt-2" onClick={onRetry}>
          {tr(isAr, 'Retry', 'إعادة المحاولة')}
        </button>
      )}
    </Panel>
  );
};
