/** Phase 3 — /pianat-admin/audit: cross-tenant action audit viewer + CSV. */
import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { downloadAuditCsv, listCrossTenantAudit } from '../../services/pianatAdminServices';
import { PianatShell, useAsync, useIsAr, tr, Loading, ErrorBox, Panel, headerBtn } from './common';

const ACTIONS = ['impersonate', 'view_data', 'edit_data', 'export_data', 'grant_membership', 'revoke_membership', 'switch_tenant', 'create_tenant'];

const CrossTenantAuditPage: React.FC = () => {
  const isAr = useIsAr();
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(
    () => listCrossTenantAudit({ action: action || undefined, page }),
    [action, page],
  );
  const rows = data?.rows ?? [];
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.per_page ?? 50)));

  return (
    <PianatShell
      titleEn="Cross-tenant audit"
      titleAr="تدقيق عبر الجهات"
      subtitleEn="Every cross-tenant action — impersonation, edits, exports, membership and tenant changes."
      subtitleAr="كل إجراء عبر الجهات — الانتحال والتعديلات والتصدير وتغييرات العضوية والجهات."
      actions={
        <button className={headerBtn} onClick={() => downloadAuditCsv().catch((e) => alert(e?.message ?? 'Export failed'))}>
          <Download size={15} /> {tr(isAr, 'Export CSV', 'تصدير CSV')}
        </button>
      }
    >
      <Panel className="mb-4">
        <label className="form-label text-xs">{tr(isAr, 'Action', 'الإجراء')}</label>
        <select className="form-select w-auto" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
          <option value="">{tr(isAr, 'All actions', 'كل الإجراءات')}</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </Panel>

      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <Panel className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 text-start">{tr(isAr, 'When', 'الوقت')}</th>
                <th className="px-4 py-3 text-start">{tr(isAr, 'Action', 'الإجراء')}</th>
                <th className="px-4 py-3 text-start">{tr(isAr, 'Actor', 'الفاعل')}</th>
                <th className="px-4 py-3 text-start">{tr(isAr, 'Target', 'الهدف')}</th>
                <th className="px-4 py-3 text-start">{tr(isAr, 'Resource', 'المورد')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-2 text-xs text-slate-500">{new Date(r.occurred_at).toLocaleString(isAr ? 'ar' : undefined)}</td>
                  <td className="px-4 py-2"><span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">{r.action}</span></td>
                  <td className="px-4 py-2">{r.actor_name ?? r.actor_user_id} <span className="text-xs text-slate-400">({r.actor_tenant_name ?? '—'})</span></td>
                  <td className="px-4 py-2">{r.target_tenant_name ?? r.target_tenant_id}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{r.resource_type ?? '—'}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{tr(isAr, 'No audit entries.', 'لا سجلات تدقيق.')}</td></tr>}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3 text-sm">
              <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{tr(isAr, 'Prev', 'السابق')}</button>
              <span>{page} / {pages}</span>
              <button className="btn btn-sm btn-outline-secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>{tr(isAr, 'Next', 'التالي')}</button>
            </div>
          )}
        </Panel>
      )}
    </PianatShell>
  );
};

export default CrossTenantAuditPage;
