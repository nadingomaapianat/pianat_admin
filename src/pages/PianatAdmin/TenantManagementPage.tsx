/** Phase 3 — /pianat-admin/tenants: paginated tenant list + filters. */
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Building2 } from 'lucide-react';
import { listTenants, TenantListRow } from '../../services/pianatAdminServices';
import { PianatShell, useAsync, useIsAr, tr, Loading, ErrorBox, Panel, headerBtnPrimary } from './common';

const ARCHETYPES = ['client', 'consulting_firm', 'audit_firm', 'regulator', 'platform_operator'];

const TenantManagementPage: React.FC = () => {
  const isAr = useIsAr();
  const [archetype, setArchetype] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const { data, loading, error, reload } = useAsync(
    () => listTenants({ archetype: archetype || undefined, search: query || undefined, page }),
    [archetype, query, page],
  );

  const rows: TenantListRow[] = data?.rows ?? [];
  const total = data?.total ?? 0;
  const perPage = data?.per_page ?? 25;
  const pages = Math.max(1, Math.ceil(total / perPage));

  return (
    <PianatShell
      titleEn="Tenants"
      titleAr="الجهات"
      subtitleEn="Every organization on the platform. Provision new ones, edit configuration, manage lifecycle."
      subtitleAr="كل المؤسسات على المنصة. أنشئ جهات جديدة، عدّل الإعدادات، أدِر دورة الحياة."
      actions={
        <Link to="/pianat-admin/tenants/new" className={headerBtnPrimary}>
          <Plus size={16} />
          {tr(isAr, 'Provision tenant', 'إنشاء جهة')}
        </Link>
      }
    >
      <Panel className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1" style={{ minWidth: 200 }}>
            <label className="form-label text-xs">{tr(isAr, 'Search', 'بحث')}</label>
            <div className="flex gap-2">
              <input
                className="form-control"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (setQuery(search), setPage(1))}
                placeholder={tr(isAr, 'name or slug…', 'الاسم أو المعرّف…')}
              />
              <button className="btn btn-primary" onClick={() => { setQuery(search); setPage(1); }}>
                <Search size={15} />
              </button>
            </div>
          </div>
          <div>
            <label className="form-label text-xs">{tr(isAr, 'Archetype', 'النوع')}</label>
            <select
              className="form-select"
              value={archetype}
              onChange={(e) => { setArchetype(e.target.value); setPage(1); }}
            >
              <option value="">{tr(isAr, 'All', 'الكل')}</option>
              {ARCHETYPES.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={reload} />
      ) : (
        <Panel className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3 text-start">{tr(isAr, 'Organization', 'الجهة')}</th>
                <th className="px-4 py-3 text-start">{tr(isAr, 'Archetype', 'النوع')}</th>
                <th className="px-4 py-3 text-center">{tr(isAr, 'Users', 'المستخدمون')}</th>
                <th className="px-4 py-3 text-center">{tr(isAr, 'Status', 'الحالة')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-slate-400" />
                      <span className="font-medium">{isAr && t.name_ar ? t.name_ar : t.name}</span>
                      <span className="text-xs text-slate-400">{t.slug}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{t.archetype}</td>
                  <td className="px-4 py-3 text-center">{t.users}</td>
                  <td className="px-4 py-3 text-center">
                    {t.is_active ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">{tr(isAr, 'active', 'نشطة')}</span>
                    ) : (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">{tr(isAr, 'suspended', 'موقوفة')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Link to={`/pianat-admin/tenants/${t.id}`} className="btn btn-sm btn-outline-primary">
                      {tr(isAr, 'Manage', 'إدارة')}
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{tr(isAr, 'No tenants found.', 'لا توجد جهات.')}</td></tr>
              )}
            </tbody>
          </table>
          {pages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
              <span className="text-slate-500">{total} {tr(isAr, 'tenants', 'جهة')}</span>
              <div className="flex gap-2">
                <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  {tr(isAr, 'Prev', 'السابق')}
                </button>
                <span className="px-2 py-1">{page} / {pages}</span>
                <button className="btn btn-sm btn-outline-secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  {tr(isAr, 'Next', 'التالي')}
                </button>
              </div>
            </div>
          )}
        </Panel>
      )}
    </PianatShell>
  );
};

export default TenantManagementPage;
