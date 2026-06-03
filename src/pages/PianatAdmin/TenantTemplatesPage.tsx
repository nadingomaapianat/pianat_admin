/** Phase 3 — /pianat-admin/tenant-templates: list + create/edit + activate/delete. */
import React, { useMemo, useState } from 'react';
import { Star, Trash2, Power, Plus, Pencil, X } from 'lucide-react';
import {
  createTemplate,
  deleteTemplate,
  getFrameworkCodes,
  getModuleCatalog,
  listTemplates,
  ModuleCatalogEntry,
  TenantTemplate,
  updateTemplate,
} from '../../services/pianatAdminServices';
import {
  PianatShell, useAsync, useIsAr, tr, Loading, ErrorBox, Panel, headerBtnPrimary,
} from './common';

const ARCHETYPES = ['client', 'consulting_firm', 'audit_firm', 'regulator'];
// Framework codes come from the backend (GET /frameworks) so they always
// match the seeded data — hardcoding caused validation failures.
const AI_AGENTS = ['policy_reader', 'gap_detector', 'cross_mapper', 'risk_scorer', 'recommender', 'self_assessment_coach', 'platform_insights', 'rollup_anomaly', 'branch_ops'];
const PLANS = ['', 'free', 'starter', 'pro', 'enterprise', 'custom'];
const LIMIT_KEYS = ['max_users', 'max_engagements_active', 'max_ai_cost_usd_monthly', 'max_documents', 'max_self_assessments'];

interface FormState {
  name: string;
  description: string;
  archetype: string;
  enabled_modules: string[];
  active_frameworks: string[];
  enabled_ai_agents: string[];
  usage_limits: Record<string, number>;
  default_subscription_plan: string;
}

const emptyForm = (): FormState => ({
  name: '', description: '', archetype: 'client',
  enabled_modules: [], active_frameworks: [], enabled_ai_agents: [],
  usage_limits: {}, default_subscription_plan: '',
});

const fromTemplate = (t: TenantTemplate): FormState => ({
  name: t.name,
  description: t.description ?? '',
  archetype: t.archetype,
  enabled_modules: t.enabled_modules ?? [],
  active_frameworks: t.active_frameworks ?? [],
  enabled_ai_agents: t.enabled_ai_agents ?? [],
  usage_limits: t.usage_limits ?? {},
  default_subscription_plan: t.default_subscription_plan ?? '',
});

const TenantTemplatesPage: React.FC = () => {
  const isAr = useIsAr();
  const { data, loading, error, reload } = useAsync<TenantTemplate[]>(() => listTemplates(false), []);
  const catalog = useAsync<ModuleCatalogEntry[]>(() => getModuleCatalog(), []);
  const frameworks = useAsync<string[]>(() => getFrameworkCodes(), []);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<TenantTemplate | 'new' | null>(null);
  const rows = data ?? [];

  const toggleActive = async (t: TenantTemplate) => {
    setBusy(true);
    try { await updateTemplate(t.id, { is_active: !t.is_active }); await reload(); }
    finally { setBusy(false); }
  };
  const remove = async (t: TenantTemplate) => {
    if (!window.confirm(tr(isAr, `Delete template "${t.name}"?`, `حذف القالب "${t.name}"؟`))) return;
    setBusy(true);
    try { await deleteTemplate(t.id); await reload(); }
    finally { setBusy(false); }
  };

  return (
    <PianatShell
      titleEn="Tenant templates"
      titleAr="قوالب الجهات"
      subtitleEn="Pre-built configurations that pre-fill the provisioning wizard. Only active templates appear in step 1."
      subtitleAr="إعدادات جاهزة تملأ معالج الإنشاء. تظهر القوالب النشطة فقط في الخطوة الأولى."
      actions={
        <button className={headerBtnPrimary} onClick={() => setEditing('new')}>
          <Plus size={15} /> {tr(isAr, 'New template', 'قالب جديد')}
        </button>
      }
    >
      {loading ? <Loading /> : error ? <ErrorBox message={error} onRetry={reload} /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((t) => (
            <Panel key={t.id} className={t.is_active ? '' : 'opacity-60'}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{t.description}</div>
                  <div className="mt-2 text-xs text-emerald-700">{t.archetype}</div>
                  <div className="mt-2 flex flex-wrap gap-1 text-xs text-slate-500">
                    <span>{(t.enabled_modules ?? []).length} {tr(isAr, 'modules', 'وحدة')}</span>·
                    <span>{(t.active_frameworks ?? []).length} {tr(isAr, 'frameworks', 'إطار')}</span>·
                    <span>{(t.enabled_ai_agents ?? []).length} {tr(isAr, 'agents', 'وكيل')}</span>
                  </div>
                  {t.default_subscription_plan && (
                    <div className="mt-1 text-xs"><Star size={11} className="me-1 inline text-amber-500" />{t.default_subscription_plan}</div>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <button className="btn btn-sm btn-outline-primary" disabled={busy} onClick={() => setEditing(t)} title={tr(isAr, 'Edit', 'تعديل')}>
                    <Pencil size={13} />
                  </button>
                  <button className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => toggleActive(t)} title={tr(isAr, 'Toggle active', 'تبديل الحالة')}>
                    <Power size={13} />
                  </button>
                  <button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => remove(t)} title={tr(isAr, 'Delete', 'حذف')}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              {!t.is_active && <div className="mt-2 text-xs text-slate-400">{tr(isAr, 'inactive', 'غير نشط')}</div>}
            </Panel>
          ))}
          {rows.length === 0 && <Panel className="text-center text-slate-400">{tr(isAr, 'No templates.', 'لا قوالب.')}</Panel>}
        </div>
      )}

      {editing && (
        <TemplateModal
          template={editing === 'new' ? null : editing}
          catalog={catalog.data ?? []}
          frameworks={frameworks.data ?? []}
          isAr={isAr}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await reload(); }}
        />
      )}
    </PianatShell>
  );
};

const TemplateModal: React.FC<{
  template: TenantTemplate | null;
  catalog: ModuleCatalogEntry[];
  frameworks: string[];
  isAr: boolean;
  onClose: () => void;
  onSaved: () => void;
}> = ({ template, catalog, frameworks, isAr, onClose, onSaved }) => {
  const [form, setForm] = useState<FormState>(template ? fromTemplate(template) : emptyForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const availableModules = useMemo(
    () => catalog.filter((m) => m.available_for_archetypes.includes(form.archetype)),
    [catalog, form.archetype],
  );

  const toggle = (field: 'enabled_modules' | 'active_frameworks' | 'enabled_ai_agents', v: string) => {
    const cur = form[field];
    set({ [field]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } as any);
  };

  const save = async () => {
    if (!form.name.trim()) { setError(tr(isAr, 'Name is required', 'الاسم مطلوب')); return; }
    setBusy(true);
    setError(null);
    const body = {
      name: form.name.trim(),
      description: form.description || undefined,
      archetype: form.archetype,
      enabled_modules: form.enabled_modules,
      active_frameworks: form.active_frameworks,
      enabled_ai_agents: form.enabled_ai_agents,
      usage_limits: form.usage_limits,
      default_subscription_plan: form.default_subscription_plan || undefined,
    };
    try {
      if (template) await updateTemplate(template.id, body);
      else await createTemplate(body);
      onSaved();
    } catch (e: any) {
      // Surface server validation (e.g. module/archetype/dependency issues).
      const issues = e?.payload?.issues;
      setError(
        Array.isArray(issues) && issues.length
          ? issues.map((i: any) => `${i.field}: ${i.message}`).join(' · ')
          : e?.message ?? 'Save failed',
      );
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1080] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
      <div
        dir={isAr ? 'rtl' : 'ltr'}
        className="max-h-[90vh] w-[720px] max-w-[95vw] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h5 className="text-lg font-semibold">
            {template ? tr(isAr, 'Edit template', 'تعديل القالب') : tr(isAr, 'New template', 'قالب جديد')}
          </h5>
          <button className="rounded-full p-1 text-slate-400 hover:bg-slate-100" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="form-label">{tr(isAr, 'Name', 'الاسم')} *</label>
              <input className="form-control" value={form.name} onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div>
              <label className="form-label">{tr(isAr, 'Archetype', 'النوع')}</label>
              <select className="form-select" value={form.archetype}
                onChange={(e) => set({ archetype: e.target.value, enabled_modules: [] })}>
                {ARCHETYPES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">{tr(isAr, 'Description', 'الوصف')}</label>
            <input className="form-control" value={form.description} onChange={(e) => set({ description: e.target.value })} />
          </div>
          <div>
            <label className="form-label">{tr(isAr, 'Default plan', 'الخطة الافتراضية')}</label>
            <select className="form-select" value={form.default_subscription_plan}
              onChange={(e) => set({ default_subscription_plan: e.target.value })}>
              {PLANS.map((p) => <option key={p} value={p}>{p || tr(isAr, '(none)', '(بدون)')}</option>)}
            </select>
          </div>

          <CheckGroup label={tr(isAr, 'Modules', 'الوحدات')} cols="md:grid-cols-2"
            items={availableModules.map((m) => ({ value: m.module_key, label: isAr ? m.name_ar : m.name_en }))}
            selected={form.enabled_modules} onToggle={(v) => toggle('enabled_modules', v)} />

          <CheckGroup label={tr(isAr, 'Frameworks', 'الأطر')} cols="md:grid-cols-3"
            items={frameworks.map((f) => ({ value: f, label: f }))}
            selected={form.active_frameworks} onToggle={(v) => toggle('active_frameworks', v)} />

          <CheckGroup label={tr(isAr, 'AI agents', 'وكلاء الذكاء')} cols="md:grid-cols-2"
            items={AI_AGENTS.map((a) => ({ value: a, label: a.replace(/_/g, ' ') }))}
            selected={form.enabled_ai_agents} onToggle={(v) => toggle('enabled_ai_agents', v)} />

          <div>
            <label className="form-label">{tr(isAr, 'Usage limits', 'حدود الاستخدام')}</label>
            <div className="grid gap-2 md:grid-cols-2">
              {LIMIT_KEYS.map((k) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="w-48 text-xs text-slate-500">{k.replace(/_/g, ' ')}</span>
                  <input type="number" min={0} className="form-control form-control-sm"
                    value={form.usage_limits[k] ?? ''} placeholder={tr(isAr, 'unlimited', 'غير محدود')}
                    onChange={(e) => {
                      const next = { ...form.usage_limits };
                      if (e.target.value === '') delete next[k]; else next[k] = Number(e.target.value);
                      set({ usage_limits: next });
                    }} />
                </div>
              ))}
            </div>
          </div>

          {error && <div className="text-sm text-rose-600">{error}</div>}

          <div className="flex justify-end gap-2 border-t pt-3">
            <button className="btn btn-outline-secondary" onClick={onClose}>{tr(isAr, 'Cancel', 'إلغاء')}</button>
            <button className="btn btn-success" disabled={busy} onClick={save}>
              {busy ? tr(isAr, 'Saving…', 'جارٍ الحفظ…') : template ? tr(isAr, 'Save', 'حفظ') : tr(isAr, 'Create', 'إنشاء')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CheckGroup: React.FC<{
  label: string;
  cols: string;
  items: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (v: string) => void;
}> = ({ label, cols, items, selected, onToggle }) => (
  <div>
    <label className="form-label">{label} <span className="text-xs text-slate-400">({selected.length})</span></label>
    <div className={`grid gap-1 ${cols}`}>
      {items.map((it) => (
        <label key={it.value} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-1.5 text-sm ${selected.includes(it.value) ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
          <input type="checkbox" checked={selected.includes(it.value)} onChange={() => onToggle(it.value)} />
          {it.label}
        </label>
      ))}
      {items.length === 0 && <span className="text-xs text-slate-400">—</span>}
    </div>
  </div>
);

export default TenantTemplatesPage;
