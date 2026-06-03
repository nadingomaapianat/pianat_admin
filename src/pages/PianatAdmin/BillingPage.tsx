/** Phase 3 — /pianat-admin/billing: revenue summary by plan. */
import React, { useState } from 'react';
import { getRevenue } from '../../services/pianatAdminServices';
import { PianatShell, useAsync, useIsAr, tr, Loading, ErrorBox, Panel } from './common';

const BillingPage: React.FC = () => {
  const isAr = useIsAr();
  const [period, setPeriod] = useState('');
  const { data, loading, error, reload } = useAsync<any>(() => getRevenue(period || undefined), [period]);

  return (
    <PianatShell
      titleEn="Billing & revenue"
      titleAr="الفوترة والإيرادات"
      subtitleEn="Monthly recurring revenue by subscription plan."
      subtitleAr="الإيراد الشهري المتكرر حسب خطة الاشتراك."
      actions={
        <input type="month" className="form-control w-auto" value={period} onChange={(e) => setPeriod(e.target.value)} />
      }
    >
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : data ? (
        <>
          <Panel className="mb-4">
            <div className="text-3xl font-bold">${data.total_mrr_usd}</div>
            <div className="text-xs text-slate-500">{tr(isAr, 'Total MRR', 'إجمالي الإيراد الشهري')} · {data.period}</div>
          </Panel>
          <Panel className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 text-start">{tr(isAr, 'Plan', 'الخطة')}</th>
                  <th className="px-4 py-3 text-start">{tr(isAr, 'Currency', 'العملة')}</th>
                  <th className="px-4 py-3 text-center">{tr(isAr, 'Subscriptions', 'الاشتراكات')}</th>
                  <th className="px-4 py-3 text-end">{tr(isAr, 'MRR (USD)', 'الإيراد الشهري')}</th>
                </tr>
              </thead>
              <tbody>
                {(data.by_plan ?? []).map((r: any, i: number) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{r.plan}</td>
                    <td className="px-4 py-2">{r.currency}</td>
                    <td className="px-4 py-2 text-center">{r.subscriptions}</td>
                    <td className="px-4 py-2 text-end">${r.mrr_usd}</td>
                  </tr>
                ))}
                {(data.by_plan ?? []).length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">{tr(isAr, 'No active subscriptions in this period.', 'لا اشتراكات نشطة في هذه الفترة.')}</td></tr>
                )}
              </tbody>
            </table>
          </Panel>
        </>
      ) : null}
    </PianatShell>
  );
};

export default BillingPage;
