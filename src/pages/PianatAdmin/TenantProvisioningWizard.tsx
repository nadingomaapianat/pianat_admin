/**
 * /pianat-admin/tenants/new — tenant provisioning wizard.
 *
 * Journey: Company → Template → Identity → Modules → Frameworks → AI Agents →
 * Limits → Subscription → Admin → Review.
 *
 * Step 0 runs the async Company Profiler (onboarding intelligence). Its output
 * is SUGGESTION-ONLY (source=web_profiler, verified=false, requires_review):
 *   • "Apply" on the Identity card pre-fills ONLY the Step 2 identity fields,
 *     and arms carry-forward HINTS (frameworks → Step 4, template → Step 1,
 *     EGX listing → Step 2) that take effect at their own step from valid
 *     backend data. Nothing is written, classified, or matched automatically.
 *   • Classification is shown as an advisory banner, never a form value.
 *   • Dedup is a soft hint here and a HARD gate at Step 9 (real tenants check).
 *   • Applied values stay marked "from web profiler" until ops edits/confirms.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Info,
  Layers,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import {
  attachCompanyProfile,
  CompanyProfileResult,
  CompanyProfileRun,
  dedupCheckTenant,
  DedupMatch,
  deepenCompanyProfile,
  getCompanyProfile,
  getFrameworkCodes,
  getModuleCatalog,
  listTemplates,
  ModuleCatalogEntry,
  provisionTenant,
  ProvisionTenantInput,
  startCompanyProfile,
  TenantTemplate,
} from '../../services/pianatAdminServices';
import { PianatShell, useAsync, useIsAr, tr, Loading, Panel, headerBtnPrimary } from './common';

const ARCHETYPES = ['client', 'consulting_firm', 'audit_firm', 'regulator'];
const AI_AGENTS = ['policy_reader', 'gap_detector', 'cross_mapper', 'risk_scorer', 'recommender', 'self_assessment_coach', 'platform_insights', 'rollup_anomaly', 'branch_ops'];
const PLANS = ['free', 'starter', 'pro', 'enterprise', 'custom'];
const LIMIT_KEYS = ['max_users', 'max_engagements_active', 'max_ai_cost_usd_monthly', 'max_documents', 'max_self_assessments'];

// Bilingual labels so Arabic mode shows Arabic everywhere (no mixed-language UI).
// Codes that are language-neutral (framework codes, FRA/CBE/EGX, currency ISO
// codes) are intentionally left as-is.
const ARCHETYPE_LABELS: Record<string, [string, string]> = {
  client: ['Client', 'عميل'],
  consulting_firm: ['Consulting firm', 'شركة استشارات'],
  audit_firm: ['Audit firm', 'شركة تدقيق'],
  regulator: ['Regulator', 'جهة رقابية'],
  platform_operator: ['Platform operator', 'مشغّل المنصة'],
};
const AGENT_LABELS: Record<string, [string, string]> = {
  policy_reader: ['Policy reader', 'قارئ السياسات'],
  gap_detector: ['Gap detector', 'كاشف الفجوات'],
  cross_mapper: ['Cross mapper', 'الربط المتقاطع'],
  risk_scorer: ['Risk scorer', 'مُقيّم المخاطر'],
  recommender: ['Recommender', 'الموصِّي'],
  self_assessment_coach: ['Self-assessment coach', 'مدرّب التقييم الذاتي'],
  platform_insights: ['Platform insights', 'رؤى المنصة'],
  rollup_anomaly: ['Roll-up anomaly', 'كشف شذوذ التجميع'],
  branch_ops: ['Branch ops', 'عمليات الفروع'],
};
const PLAN_LABELS: Record<string, [string, string]> = {
  free: ['Free', 'مجاني'],
  starter: ['Starter', 'مبتدئ'],
  pro: ['Pro', 'احترافي'],
  enterprise: ['Enterprise', 'مؤسسي'],
  custom: ['Custom', 'مخصّص'],
};
const LIMIT_LABELS: Record<string, [string, string]> = {
  max_users: ['Max users', 'أقصى عدد مستخدمين'],
  max_engagements_active: ['Max active engagements', 'أقصى ارتباطات نشطة'],
  max_ai_cost_usd_monthly: ['Max AI cost (USD/mo)', 'أقصى تكلفة ذكاء (دولار/شهريًا)'],
  max_documents: ['Max documents', 'أقصى عدد مستندات'],
  max_self_assessments: ['Max self-assessments', 'أقصى تقييمات ذاتية'],
};
const MATCH_STATUS_LABELS: Record<string, [string, string]> = {
  CONFIRMED: ['Confirmed', 'مؤكَّد'],
  NOT_FOUND: ['Not found', 'غير موجود'],
  NOT_LISTED_YET: ['Not listed yet', 'غير مُدرج بعد'],
};
const lbl = (map: Record<string, [string, string]>, key: string, isAr: boolean) =>
  map[key] ? tr(isAr, map[key][0], map[key][1]) : key.replace(/_/g, ' ');

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const STEP = {
  Company: 0,
  Template: 1,
  Identity: 2,
  Modules: 3,
  Frameworks: 4,
  Agents: 5,
  Limits: 6,
  Subscription: 7,
  Admin: 8,
  Review: 9,
} as const;

const STEPS = [
  ['Company', 'الشركة'],
  ['Template', 'القالب'],
  ['Identity', 'الهوية'],
  ['Modules', 'الوحدات'],
  ['Frameworks', 'الأطر'],
  ['AI Agents', 'وكلاء الذكاء'],
  ['Limits', 'الحدود'],
  ['Subscription', 'الاشتراك'],
  ['Admin user', 'المدير'],
  ['Review', 'المراجعة'],
] as const;

const ACTIVE_STATUSES = ['queued', 'running', 'profiling_b'];

/** Carry-forward hints stored at Step 0, applied at their own step. */
interface ProfilerHints {
  suggested_frameworks: string[];
  template_hint: string | null;
  is_egx_listed: boolean;
  egx_ticker: string | null;
  cr_number: string | null;
}

const TenantProvisioningWizard: React.FC = () => {
  const isAr = useIsAr();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const templates = useAsync<TenantTemplate[]>(() => listTemplates(true), []);
  const catalog = useAsync<ModuleCatalogEntry[]>(() => getModuleCatalog(), []);
  const frameworks = useAsync<string[]>(() => getFrameworkCodes(), []);
  const FRAMEWORKS = frameworks.data ?? [];

  const [form, setForm] = useState<ProvisionTenantInput>({
    name: '', slug: '', archetype: 'client', default_language: 'en',
    enabled_modules: [], active_frameworks: [], enabled_ai_agents: [],
    usage_limits: {}, initial_admin: { email: '', name: '', username: '', send_invite_email: true },
  });
  const set = (patch: Partial<ProvisionTenantInput>) => setForm((f) => ({ ...f, ...patch }));

  // Profiler-sourced identity fields that ops hasn't edited/confirmed yet.
  const [provenance, setProvenance] = useState<Set<string>>(new Set());
  const [arUnverified, setArUnverified] = useState(false);
  /** Edit an identity field and drop its "from profiler" mark (ops confirmed it). */
  const editField = (keys: string[], patch: Partial<ProvisionTenantInput>) => {
    set(patch);
    setProvenance((p) => {
      if (!keys.some((k) => p.has(k))) return p;
      const n = new Set(p);
      keys.forEach((k) => n.delete(k));
      return n;
    });
    if (keys.includes('name_ar')) setArUnverified(false);
  };

  // ── Company Profiler state ──────────────────────────────────────────────
  const [companyName, setCompanyName] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [run, setRun] = useState<CompanyProfileRun | null>(null);
  const [profErr, setProfErr] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [hints, setHints] = useState<ProfilerHints | null>(null);
  const [fwHintApplied, setFwHintApplied] = useState(false);

  const startProfiling = async () => {
    const n = companyName.trim();
    if (!n) return;
    setProfErr(null);
    setApplied(false);
    setRun(null);
    try {
      const { id } = await startCompanyProfile(n);
      setProfileId(id);
    } catch (e: any) {
      setProfErr(e?.message ?? 'Could not start the profiler.');
    }
  };

  // Poll while active. Keep polling through the enterprise auto-Stage-B handoff.
  useEffect(() => {
    if (!profileId) return;
    const status = run?.status;
    const keepPolling =
      !status ||
      ACTIVE_STATUSES.includes(status) ||
      (status === 'stage_a_done' && run?.profile?.suggested_classification?.value === 'enterprise');
    if (!keepPolling) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await getCompanyProfile(profileId);
        if (!cancelled) setRun(r);
      } catch (e: any) {
        if (!cancelled) setProfErr(e?.message ?? 'Lost contact with the profiler.');
      }
    };
    tick();
    const h = window.setInterval(tick, 2500);
    return () => {
      cancelled = true;
      window.clearInterval(h);
    };
  }, [profileId, run?.status]);

  const deepen = async () => {
    if (!profileId) return;
    try {
      await deepenCompanyProfile(profileId);
      setRun((r) => (r ? { ...r, status: 'profiling_b' } : r));
    } catch (e: any) {
      setProfErr(e?.message ?? 'Could not request deeper profiling.');
    }
  };

  /** Apply the Identity card: pre-fill Step 2 fields + arm carry-forward hints. */
  const applyIdentity = () => {
    const p = run?.profile;
    if (!p) return;
    const wp = p.wizard_prefill;
    const legalName = wp.legal_name_en || companyName.trim();
    const patch: Partial<ProvisionTenantInput> = {};
    const prov = new Set<string>();
    if (legalName) {
      patch.name = legalName;
      patch.slug = form.slug || slugify(legalName);
      prov.add('name');
    }
    if (wp.name_ar) {
      patch.name_ar = wp.name_ar;
      prov.add('name_ar');
    }
    if (wp.industry) {
      patch.industry = wp.industry;
      prov.add('industry');
    }
    set(patch);
    setProvenance(prov);
    setArUnverified(Boolean(wp.name_ar) && !wp.name_ar_verified);
    // Carry-forward hints — applied at their own steps, from valid backend data.
    setHints({
      suggested_frameworks: wp.suggested_frameworks ?? [],
      template_hint: wp.suggested_template_hint ?? null,
      is_egx_listed: wp.is_egx_listed,
      egx_ticker: wp.egx_ticker,
      cr_number: p.dedup_candidates?.cr_number ?? null,
    });
    setFwHintApplied(false); // re-arm framework pre-selection
    setApplied(true);
  };

  // Carry-forward: pre-select suggested frameworks once the LIVE backend list is
  // loaded, dropping any code the backend doesn't return. Adds only; never removes.
  useEffect(() => {
    if (!hints || fwHintApplied || frameworks.loading || !FRAMEWORKS.length) return;
    const valid = hints.suggested_frameworks.filter((f) => FRAMEWORKS.includes(f));
    if (valid.length) {
      setForm((f) => ({ ...f, active_frameworks: Array.from(new Set([...f.active_frameworks, ...valid])) }));
    }
    setFwHintApplied(true);
  }, [hints, fwHintApplied, frameworks.loading, FRAMEWORKS]);

  // Carry-forward: which saved template the profiler hint points at (advisory only).
  const suggestedTemplateId = useMemo(() => {
    if (!hints?.template_hint) return null;
    const h = hints.template_hint.toLowerCase();
    const t = (templates.data ?? []).find(
      (x) => x.name.toLowerCase().includes(h) || x.archetype.toLowerCase().includes(h) || h.includes(x.archetype.toLowerCase()),
    );
    return t?.id ?? null;
  }, [hints, templates.data]);

  // ── Step 9 hard dedup gate ───────────────────────────────────────────────
  const [dedup, setDedup] = useState<{ loading: boolean; checked: boolean; matches: DedupMatch[] }>({
    loading: false, checked: false, matches: [],
  });
  const [dedupOverride, setDedupOverride] = useState(false);

  useEffect(() => {
    if (step !== STEP.Review || !form.name.trim()) return;
    let cancelled = false;
    setDedup({ loading: true, checked: false, matches: [] });
    setDedupOverride(false);
    dedupCheckTenant({ name: form.name, name_ar: form.name_ar, cr: hints?.cr_number ?? undefined })
      .then((r) => !cancelled && setDedup({ loading: false, checked: true, matches: r.matches ?? [] }))
      .catch(() => !cancelled && setDedup({ loading: false, checked: true, matches: [] }));
    return () => {
      cancelled = true;
    };
  }, [step, form.name, form.name_ar, hints?.cr_number]);

  const dedupBlocked = dedup.matches.length > 0 && !dedupOverride;

  const moduleByKey = useMemo(
    () => new Map((catalog.data ?? []).map((m) => [m.module_key, m])),
    [catalog.data],
  );
  const availableModules = useMemo(
    () => (catalog.data ?? []).filter((m) => m.available_for_archetypes.includes(form.archetype)),
    [catalog.data, form.archetype],
  );

  const applyTemplate = (tpl: TenantTemplate) => {
    const validFrameworks = new Set(FRAMEWORKS);
    const validModules = new Set(
      (catalog.data ?? [])
        .filter((m) => m.available_for_archetypes.includes(tpl.archetype))
        .map((m) => m.module_key),
    );
    const validAgents = new Set(AI_AGENTS);
    set({
      archetype: tpl.archetype,
      enabled_modules: (tpl.enabled_modules ?? []).filter((m) => validModules.has(m)),
      active_frameworks: (tpl.active_frameworks ?? []).filter((f) => validFrameworks.has(f)),
      enabled_ai_agents: (tpl.enabled_ai_agents ?? []).filter((a) => validAgents.has(a)),
      usage_limits: tpl.usage_limits ?? {},
      subscription: tpl.default_subscription_plan
        ? { plan: tpl.default_subscription_plan, monthly_price_usd: 0, currency: 'USD' }
        : form.subscription,
    });
    setStep(STEP.Identity);
  };

  const toggleModule = (key: string) => {
    const has = form.enabled_modules.includes(key);
    const next = has
      ? form.enabled_modules.filter((m) => m !== key)
      : [...form.enabled_modules, key];
    if (!has) {
      const queue = [...(moduleByKey.get(key)?.requires_modules ?? [])];
      while (queue.length) {
        const d = queue.shift()!;
        if (!next.includes(d)) {
          next.push(d);
          queue.push(...(moduleByKey.get(d)?.requires_modules ?? []));
        }
      }
    }
    set({ enabled_modules: next });
  };

  const toggleIn = (field: 'active_frameworks' | 'enabled_ai_agents', val: string) => {
    const cur = form[field];
    set({ [field]: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] } as any);
  };

  const submit = async () => {
    if (dedupBlocked) return; // hard gate — must override an existing-tenant match
    setBusy(true);
    setError(null);
    try {
      const result = await provisionTenant({
        ...form,
        ui_direction: form.default_language === 'ar' ? 'rtl' : 'ltr',
      });
      const newId = result?.tenant_id ?? result?.id ?? '';
      // Attach the profiler run to the tenant so its web-profiler data is
      // viewable + editable from the tenant detail page later.
      if (profileId && newId) {
        try {
          await attachCompanyProfile(profileId, newId);
        } catch {
          /* non-fatal: tenant is created regardless */
        }
      }
      navigate(`/pianat-admin/tenants/${newId}`);
    } catch (e: any) {
      const issues = e?.payload?.issues;
      setError(
        Array.isArray(issues) && issues.length
          ? issues.map((i: any) => `${i.field}: ${i.message}`).join(' · ')
          : e?.message ?? 'Provisioning failed',
      );
      setBusy(false);
    }
  };

  const canNext = () => {
    if (step === STEP.Identity) return form.name.trim() && form.slug.trim();
    if (step === STEP.Modules) return form.enabled_modules.length > 0;
    if (step === STEP.Admin) return form.initial_admin.email && form.initial_admin.username && form.initial_admin.name;
    return true;
  };

  const goNext = () => {
    if (step === STEP.Company && !form.name.trim() && companyName.trim()) {
      set({ name: companyName.trim(), slug: form.slug || slugify(companyName) });
    }
    setStep((s) => s + 1);
  };

  return (
    <PianatShell
      titleEn="Provision a tenant"
      titleAr="إنشاء جهة"
      subtitleEn="Configure exactly what the new organization gets — modules, frameworks, AI agents, limits."
      subtitleAr="حدّد بالضبط ما تحصل عليه الجهة الجديدة — الوحدات والأطر ووكلاء الذكاء والحدود."
    >
      <Panel className="mb-4 overflow-x-auto">
        <div className="flex items-center gap-1 text-xs">
          {STEPS.map(([en, ar], i) => (
            <React.Fragment key={en}>
              <button
                className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 ${
                  i === step ? 'bg-emerald-600 text-white' : i < step ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}
                onClick={() => i < step && setStep(i)}
              >
                {i < step ? <Check size={12} /> : <span>{i + 1}</span>}
                {tr(isAr, en, ar)}
              </button>
              {i < STEPS.length - 1 && <span className="text-slate-300">·</span>}
            </React.Fragment>
          ))}
        </div>
      </Panel>

      {catalog.loading ? (
        <Loading />
      ) : (
        <Panel>
          {/* Step 0 — Company (profiler) */}
          {step === STEP.Company && (
            <div>
              <h2 className="mb-1 flex items-center gap-2 text-base font-semibold">
                <Sparkles size={18} className="text-emerald-600" />
                {tr(isAr, 'Who are we onboarding?', 'من الذي نقوم بإضافته؟')}
              </h2>
              <p className="mb-3 max-w-2xl text-sm text-slate-500">
                {tr(
                  isAr,
                  'اكتب اسم الشركة وسيقوم محلّل الإعداد بالبحث في الخلفية (FRA / CBE / EGX) لاقتراح الهوية والجهات الرقابية والتصنيف — كل ذلك للمراجعة فقط، ولا يتم إنشاء أو مطابقة أي شيء تلقائيًا.',
                  'Type the company name. The onboarding analyst profiles it in the background (FRA / CBE / EGX) to suggest identity, regulators and a classification — all for review only. Nothing is created or matched automatically.',
                )}
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <div className="grow" style={{ minWidth: 280 }}>
                  <label className="form-label">{tr(isAr, 'Company name', 'اسم الشركة')}</label>
                  <input
                    className="form-control"
                    value={companyName}
                    placeholder={tr(isAr, 'e.g. Madinet Masr for Housing & Development', 'مثال: مدينة مصر للإسكان والتعمير')}
                    onChange={(e) => setCompanyName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && startProfiling()}
                  />
                </div>
                <button
                  className="btn btn-primary d-flex align-items-center"
                  style={{ gap: 6 }}
                  disabled={!companyName.trim() || (run ? ACTIVE_STATUSES.includes(run.status) : false)}
                  onClick={startProfiling}
                >
                  <Search size={15} /> {tr(isAr, 'Profile company', 'حلّل الشركة')}
                </button>
              </div>

              {profErr && <div className="mt-3 text-sm text-rose-600">{profErr}</div>}

              {profileId && (
                <ProfilerPanel
                  run={run}
                  isAr={isAr}
                  applied={applied}
                  onApplyIdentity={applyIdentity}
                  onDeepen={deepen}
                />
              )}

              <p className="mt-4 text-xs text-slate-400">
                {tr(
                  isAr,
                  'يمكنك المتابعة فورًا — يستمر التحليل في الخلفية ويمكنك تطبيق الاقتراحات لاحقًا.',
                  'You can continue right away — profiling keeps running in the background and you can apply suggestions at any time.',
                )}
              </p>
            </div>
          )}

          {/* Step 1 — Template */}
          {step === STEP.Template && (
            <div>
              <h2 className="mb-3 text-base font-semibold">{tr(isAr, 'Start from a template (optional)', 'ابدأ من قالب (اختياري)')}</h2>
              {suggestedTemplateId && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <Sparkles size={14} /> {tr(isAr, 'The highlighted template is suggested by the web profiler — advisory.', 'القالب المميّز مقترح من محلّل الويب — اختياري.')}
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(templates.data ?? []).map((tpl) => {
                  const suggested = tpl.id === suggestedTemplateId;
                  return (
                    <button
                      key={tpl.id}
                      className={`relative rounded-2xl border p-4 text-start hover:border-emerald-400 ${suggested ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-slate-200'}`}
                      onClick={() => applyTemplate(tpl)}
                    >
                      {suggested && (
                        <span className="absolute end-2 top-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {tr(isAr, 'Suggested', 'مقترح')}
                        </span>
                      )}
                      <div className="font-semibold">{tpl.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{tpl.description}</div>
                      <div className="mt-2 text-xs text-emerald-600">{tpl.archetype}</div>
                    </button>
                  );
                })}
              </div>
              <button className="btn btn-outline-secondary mt-4" onClick={() => setStep(STEP.Identity)}>
                {tr(isAr, 'Start blank →', 'ابدأ فارغًا →')}
              </button>
            </div>
          )}

          {/* Step 2 — Identity */}
          {step === STEP.Identity && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="form-label">
                  {tr(isAr, 'Name (EN)', 'الاسم')} * {provenance.has('name') && <FromProfiler isAr={isAr} />}
                </label>
                <input className="form-control" value={form.name}
                  onChange={(e) => editField(['name'], { name: e.target.value, slug: form.slug || slugify(e.target.value) })} />
              </div>
              <div>
                <label className="form-label">
                  {tr(isAr, 'Name (AR)', 'الاسم بالعربية')}
                  {provenance.has('name_ar') && !arUnverified && <FromProfiler isAr={isAr} />}
                  {arUnverified && (
                    <span className="ms-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                      {tr(isAr, 'unverified — confirm', 'غير مؤكد — راجِع')}
                    </span>
                  )}
                </label>
                <input
                  className={`form-control ${arUnverified ? 'border-amber-400' : ''}`}
                  dir="rtl"
                  value={form.name_ar ?? ''}
                  onChange={(e) => editField(['name_ar'], { name_ar: e.target.value })}
                />
                {arUnverified && (
                  <div className="mt-1 text-[11px] text-amber-600">
                    {tr(isAr, 'Arabic name is a web guess — edit or confirm it before creating.', 'الاسم العربي مُخمَّن من الويب؛ عدّله أو أكّده قبل الإنشاء.')}
                  </div>
                )}
              </div>
              <div>
                <label className="form-label">{tr(isAr, 'Slug', 'المعرّف')} *</label>
                <input className="form-control" value={form.slug} onChange={(e) => editField(['slug'], { slug: e.target.value })} />
              </div>
              <div>
                <label className="form-label">{tr(isAr, 'Archetype', 'النوع')}</label>
                <select className="form-select" value={form.archetype} onChange={(e) => set({ archetype: e.target.value, enabled_modules: [] })}>
                  {ARCHETYPES.map((a) => <option key={a} value={a}>{lbl(ARCHETYPE_LABELS, a, isAr)}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">{tr(isAr, 'Default language', 'اللغة الافتراضية')}</label>
                <select className="form-select" value={form.default_language} onChange={(e) => set({ default_language: e.target.value as 'en' | 'ar' })}>
                  <option value="en">English (LTR)</option>
                  <option value="ar">العربية (RTL)</option>
                </select>
              </div>
              <div>
                <label className="form-label">
                  {tr(isAr, 'Industry', 'القطاع')} {provenance.has('industry') && <FromProfiler isAr={isAr} />}
                </label>
                <input className="form-control" value={form.industry ?? ''} onChange={(e) => editField(['industry'], { industry: e.target.value })} />
              </div>
              {hints?.is_egx_listed && (
                <div className="md:col-span-2 flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 text-xs text-blue-700">
                  <Info size={14} />
                  {tr(isAr, 'Per web profiler: listed on EGX', 'وفقًا لمحلّل الويب: مُدرجة في البورصة المصرية')}
                  {hints.egx_ticker ? ` · ${hints.egx_ticker}` : ''} · {tr(isAr, 'review', 'للمراجعة')}
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Modules */}
          {step === STEP.Modules && (
            <div>
              <div className="mb-2 text-sm text-slate-500">
                {form.enabled_modules.length} / {availableModules.length} {tr(isAr, 'modules enabled', 'وحدة مفعّلة')}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {availableModules.map((m) => (
                  <label key={m.module_key} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2 text-sm ${form.enabled_modules.includes(m.module_key) ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
                    <input type="checkbox" checked={form.enabled_modules.includes(m.module_key)} onChange={() => toggleModule(m.module_key)} />
                    <span>
                      <span className="font-medium">{isAr ? m.name_ar : m.name_en}</span>
                      {m.is_premium && <Star size={12} className="ms-1 inline text-amber-500" />}
                      {(m.requires_modules?.length ?? 0) > 0 && (
                        <span className="ms-1 text-xs text-slate-400">→ {m.requires_modules!.join(', ')}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 — Frameworks */}
          {step === STEP.Frameworks && (
            <div>
              {hints && fwHintApplied && hints.suggested_frameworks.some((f) => FRAMEWORKS.includes(f)) && (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                  <Sparkles size={14} /> {tr(isAr, 'Profiler-suggested frameworks are pre-selected — adjust freely.', 'الأطر المقترحة من محلّل الويب مُحدَّدة مسبقًا — عدّلها بحرّية.')}
                </div>
              )}
              <div className="grid gap-2 md:grid-cols-3">
                {FRAMEWORKS.map((f) => (
                  <label key={f} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2 text-sm ${form.active_frameworks.includes(f) ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
                    <input type="checkbox" checked={form.active_frameworks.includes(f)} onChange={() => toggleIn('active_frameworks', f)} />
                    {f}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 5 — AI agents */}
          {step === STEP.Agents && (
            <div className="grid gap-2 md:grid-cols-2">
              {AI_AGENTS.map((a) => (
                <label key={a} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2 text-sm ${form.enabled_ai_agents.includes(a) ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200'}`}>
                  <input type="checkbox" checked={form.enabled_ai_agents.includes(a)} onChange={() => toggleIn('enabled_ai_agents', a)} />
                  {lbl(AGENT_LABELS, a, isAr)}
                </label>
              ))}
            </div>
          )}

          {/* Step 6 — Limits */}
          {step === STEP.Limits && (
            <div className="grid gap-3 md:grid-cols-2">
              {LIMIT_KEYS.map((k) => (
                <div key={k}>
                  <label className="form-label">{lbl(LIMIT_LABELS, k, isAr)}</label>
                  <input
                    type="number" min={0} className="form-control"
                    value={form.usage_limits[k] ?? ''}
                    placeholder={tr(isAr, 'unlimited', 'غير محدود')}
                    onChange={(e) => {
                      const v = e.target.value;
                      const next = { ...form.usage_limits };
                      if (v === '') delete next[k]; else next[k] = Number(v);
                      set({ usage_limits: next });
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Step 7 — Subscription */}
          {step === STEP.Subscription && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="form-label">{tr(isAr, 'Plan', 'الخطة')}</label>
                <select className="form-select" value={form.subscription?.plan ?? ''} onChange={(e) => set({ subscription: { plan: e.target.value, monthly_price_usd: form.subscription?.monthly_price_usd ?? 0, currency: form.subscription?.currency ?? 'USD' } })}>
                  <option value="">{tr(isAr, 'No subscription', 'بدون اشتراك')}</option>
                  {PLANS.map((p) => <option key={p} value={p}>{lbl(PLAN_LABELS, p, isAr)}</option>)}
                </select>
              </div>
              {form.subscription?.plan && (
                <>
                  <div>
                    <label className="form-label">{tr(isAr, 'Monthly price (USD)', 'السعر الشهري')}</label>
                    <input type="number" min={0} className="form-control" value={form.subscription.monthly_price_usd}
                      onChange={(e) => set({ subscription: { ...form.subscription!, monthly_price_usd: Number(e.target.value) } })} />
                  </div>
                  <div>
                    <label className="form-label">{tr(isAr, 'Currency', 'العملة')}</label>
                    <select className="form-select" value={form.subscription.currency}
                      onChange={(e) => set({ subscription: { ...form.subscription!, currency: e.target.value } })}>
                      {['USD', 'EGP', 'SAR', 'AED'].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 8 — Admin user */}
          {step === STEP.Admin && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="form-label">{tr(isAr, 'Email', 'البريد')} *</label>
                <input type="email" className="form-control" value={form.initial_admin.email}
                  onChange={(e) => set({ initial_admin: { ...form.initial_admin, email: e.target.value } })} />
              </div>
              <div>
                <label className="form-label">{tr(isAr, 'Full name', 'الاسم الكامل')} *</label>
                <input className="form-control" value={form.initial_admin.name}
                  onChange={(e) => set({ initial_admin: { ...form.initial_admin, name: e.target.value } })} />
              </div>
              <div>
                <label className="form-label">{tr(isAr, 'Username', 'اسم المستخدم')} *</label>
                <input className="form-control" value={form.initial_admin.username}
                  onChange={(e) => set({ initial_admin: { ...form.initial_admin, username: e.target.value } })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.initial_admin.send_invite_email ?? true}
                  onChange={(e) => set({ initial_admin: { ...form.initial_admin, send_invite_email: e.target.checked } })} />
                {tr(isAr, 'Send invite email', 'إرسال بريد دعوة')}
              </label>
            </div>
          )}

          {/* Step 9 — Review */}
          {step === STEP.Review && (
            <div className="grid gap-2 text-sm">
              <DedupGate
                isAr={isAr}
                dedup={dedup}
                override={dedupOverride}
                onOverride={setDedupOverride}
              />
              <Row k={tr(isAr, 'Name', 'الاسم')} v={`${form.name} (${form.slug})`} />
              {form.name_ar && <Row k={tr(isAr, 'Name (AR)', 'الاسم بالعربية')} v={<span dir="rtl">{form.name_ar}{arUnverified ? ` — ${tr(isAr, 'unverified', 'غير مؤكد')}` : ''}</span>} />}
              <Row k={tr(isAr, 'Archetype', 'النوع')} v={lbl(ARCHETYPE_LABELS, form.archetype, isAr)} />
              <Row k={tr(isAr, 'Language', 'اللغة')} v={form.default_language === 'ar' ? tr(isAr, 'Arabic', 'العربية') : tr(isAr, 'English', 'الإنجليزية')} />
              <Row k={tr(isAr, 'Modules', 'الوحدات')} v={`${form.enabled_modules.length}`} />
              <Row k={tr(isAr, 'Frameworks', 'الأطر')} v={form.active_frameworks.join(', ') || '—'} />
              <Row k={tr(isAr, 'AI agents', 'وكلاء الذكاء')} v={form.enabled_ai_agents.map((a) => lbl(AGENT_LABELS, a, isAr)).join(isAr ? '، ' : ', ') || '—'} />
              {hints?.is_egx_listed && <Row k="EGX" v={`${tr(isAr, 'listed', 'مُدرجة')}${hints.egx_ticker ? ` · ${hints.egx_ticker}` : ''}`} />}
              <Row k={tr(isAr, 'Admin', 'المدير')} v={`${form.initial_admin.name} <${form.initial_admin.email}>`} />
              <div className="mt-2">
                <label className="form-label">{tr(isAr, 'Provisioning notes', 'ملاحظات الإنشاء')}</label>
                <textarea className="form-control" rows={2} value={form.provisioning_notes ?? ''}
                  onChange={(e) => set({ provisioning_notes: e.target.value })} />
              </div>
              {error && <div className="text-rose-600">{error}</div>}
            </div>
          )}

          {/* Nav */}
          <div className="mt-5 flex justify-between border-t pt-4">
            <button className="btn btn-outline-secondary d-flex align-items-center" style={{ gap: 4 }} disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft size={15} /> {tr(isAr, 'Back', 'رجوع')}
            </button>
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary d-flex align-items-center" style={{ gap: 4 }} disabled={!canNext()} onClick={goNext}>
                {tr(isAr, 'Next', 'التالي')} <ChevronRight size={15} />
              </button>
            ) : (
              <button className="btn btn-success" disabled={busy || dedup.loading || dedupBlocked} onClick={submit}>
                {busy ? tr(isAr, 'Creating…', 'جارٍ الإنشاء…') : tr(isAr, 'Create tenant', 'إنشاء الجهة')}
              </button>
            )}
          </div>
        </Panel>
      )}
    </PianatShell>
  );
};

// ── Small shared bits ───────────────────────────────────────────────────────

const FromProfiler: React.FC<{ isAr: boolean }> = ({ isAr }) => (
  <span className="ms-1 inline-flex items-center gap-0.5 rounded bg-emerald-100 px-1.5 py-0.5 align-middle text-[10px] font-medium text-emerald-700">
    <Sparkles size={9} /> {tr(isAr, 'from web profiler', 'من محلّل الويب')}
  </span>
);

// ── Step 9 hard dedup gate ────────────────────────────────────────────────

const DedupGate: React.FC<{
  isAr: boolean;
  dedup: { loading: boolean; checked: boolean; matches: DedupMatch[] };
  override: boolean;
  onOverride: (v: boolean) => void;
}> = ({ isAr, dedup, override, onOverride }) => {
  if (dedup.loading) {
    return (
      <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <Loader2 size={13} className="animate-spin" /> {tr(isAr, 'Checking for duplicates against existing tenants…', 'جارٍ فحص التكرار مقابل الجهات الحالية…')}
      </div>
    );
  }
  if (!dedup.checked || dedup.matches.length === 0) {
    return dedup.checked ? (
      <div className="mb-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
        <Check size={13} /> {tr(isAr, 'No matching tenant found — clear to create.', 'لا توجد جهة مطابقة — جاهز للإنشاء.')}
      </div>
    ) : null;
  }
  return (
    <div className="mb-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-800">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle size={15} /> {tr(isAr, 'This tenant may already exist', 'قد تكون هذه الجهة موجودة بالفعل')}
      </div>
      <ul className="mt-2 space-y-1 text-sm">
        {dedup.matches.map((m) => (
          <li key={m.id} className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{m.name}</span>
            {m.name_ar && <span dir="rtl" className="text-rose-700">({m.name_ar})</span>}
            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px]">{m.slug}</span>
            <span className="text-[11px] text-rose-600">
              {tr(isAr, 'matched on', 'تطابق في')} {m.matched_on}
            </span>
          </li>
        ))}
      </ul>
      <label className="mt-3 flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={override} onChange={(e) => onOverride(e.target.checked)} />
        {tr(isAr, 'This is a different entity — create anyway', 'هذه جهة مختلفة — أنشئها على أي حال')}
      </label>
    </div>
  );
};

// ── Profiler suggestions panel ──────────────────────────────────────────────

const ProfilerPanel: React.FC<{
  run: CompanyProfileRun | null;
  isAr: boolean;
  applied: boolean;
  onApplyIdentity: () => void;
  onDeepen: () => void;
}> = ({ run, isAr, applied, onApplyIdentity, onDeepen }) => {
  const status = run?.status ?? 'queued';
  const profile = run?.profile ?? null;
  const isActive = ACTIVE_STATUSES.includes(status);
  const notFound = profile?.match_status === 'NOT_FOUND' && (profile?.confidence ?? 0) < 0.4;

  const statusLabel = (() => {
    switch (status) {
      case 'queued': return tr(isAr, 'Queued…', 'في الانتظار…');
      case 'running': return tr(isAr, 'Profiling (Stage A)…', 'جارٍ التحليل (المرحلة أ)…');
      case 'stage_a_done': return tr(isAr, 'Stage A complete', 'اكتملت المرحلة أ');
      case 'profiling_b': return tr(isAr, 'Mapping corporate hierarchy (Stage B)…', 'رسم الهيكل المؤسسي (المرحلة ب)…');
      case 'done': return tr(isAr, 'Profile complete', 'اكتمل الملف');
      case 'failed': return tr(isAr, 'Profiling failed', 'فشل التحليل');
      default: return status;
    }
  })();

  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
          {isActive ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {statusLabel}
          {profile && (
            <span className="text-xs font-normal text-slate-500">
              · {tr(isAr, 'confidence', 'الثقة')} {Math.round((profile.confidence ?? 0) * 100)}% · {lbl(MATCH_STATUS_LABELS, profile.match_status, isAr)}
            </span>
          )}
        </div>
        {status === 'stage_a_done' && profile?.suggested_classification?.value !== 'enterprise' && (
          <button className="btn btn-outline-primary btn-sm" onClick={onDeepen}>
            {tr(isAr, 'Deepen (Stage B)', 'تحليل أعمق')}
          </button>
        )}
      </div>

      <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        {tr(
          isAr,
          'اقتراحات للمراجعة فقط — غير مُتحقق منها، ولا يتم إنشاء أو دمج أو تصنيف أي شيء تلقائيًا.',
          'Suggestions for review only — unverified, web best-effort. Nothing is created, merged, or classified automatically.',
        )}
      </div>

      {status === 'failed' && (
        <div className="text-sm text-rose-600">{run?.error ?? tr(isAr, 'The profiler could not complete.', 'تعذّر إكمال التحليل.')}</div>
      )}

      {!profile && isActive && (
        <div className="text-sm text-slate-500">
          {tr(isAr, 'Working in the background — feel free to continue.', 'يعمل في الخلفية — يمكنك المتابعة.')}
        </div>
      )}

      {/* NOT_FOUND neutral state — never blocks, never downgrades. */}
      {profile && notFound && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          {tr(
            isAr,
            'لم يُعثر على ملف ويب لهذه الشركة. تابع الإدخال يدويًا — غياب الإشارة ليس دليلًا على شيء.',
            'No web profile found for this company. Continue entering details manually — absence of a signal is not itself a signal.',
          )}
        </div>
      )}

      {profile && !notFound && (
        <>
          <ClassificationBanner p={profile} isAr={isAr} />
          <div className="grid gap-3 md:grid-cols-2">
            <IdentityCard p={profile} isAr={isAr} applied={applied} onApply={onApplyIdentity} />
            <RegulatorsCard p={profile} isAr={isAr} />
            <DedupCard p={profile} isAr={isAr} />
            {profile.hierarchy_candidates && <HierarchyCard p={profile} isAr={isAr} />}
          </div>
        </>
      )}

      {profile && (profile.inaccessible_urls.length > 0 || profile.web_search_note) && (
        <div className="mt-3 text-xs text-slate-400">
          {profile.web_search_note && <div>{profile.web_search_note}</div>}
          {profile.inaccessible_urls.length > 0 && (
            <div>{tr(isAr, 'Could not open', 'تعذّر فتح')}: {profile.inaccessible_urls.length} {tr(isAr, 'url(s)', 'رابط')}</div>
          )}
        </div>
      )}
    </div>
  );
};

/** Advisory classification banner — NOT a form value. */
// The backend builds hard_trigger_reason from a fixed set of English phrases;
// translate each to Arabic so the banner is fully localized.
const REASON_AR: Record<string, string> = {
  'regulated financial institution': 'مؤسسة مالية خاضعة للرقابة',
  'regulator supervision detected': 'وجود إشراف رقابي',
  'public / egx-listed company': 'شركة عامة / مُدرجة في البورصة المصرية',
  'more than one real legal entity': 'أكثر من كيان قانوني واحد',
};
const localizeReason = (reason: string, isAr: boolean) =>
  !isAr
    ? reason
    : reason
        .split(/;\s*/)
        .map((p) => REASON_AR[p.trim().toLowerCase()] ?? p.trim())
        .filter(Boolean)
        .join('؛ ');

const ClassificationBanner: React.FC<{ p: CompanyProfileResult; isAr: boolean }> = ({ p, isAr }) => {
  const sc = p.suggested_classification;
  if (sc.value !== 'enterprise' || !sc.hard_trigger_hit) return null;
  const reason = sc.hard_trigger_reason ?? '';
  const multiEntity =
    /more than one|multiple|legal entit/i.test(reason) ||
    (p.hierarchy_candidates?.subsidiaries?.length ?? 0) > 0;
  return (
    <div className="mb-3 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-emerald-900">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Layers size={15} />
        {tr(isAr, 'Profiler flags this as Enterprise', 'يقترح المحلّل تصنيف «مؤسسي»')}
      </div>
      {reason && (
        <div className="mt-1 text-sm">
          {tr(isAr, 'reason', 'السبب')}: {localizeReason(reason, isAr)}
        </div>
      )}
      {multiEntity && (
        <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-white/70 px-2 py-1.5 text-xs text-emerald-800">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {tr(
            isAr,
            'يبدو أن هذه مجموعة متعددة الكيانات. إنشاء جهة يُنشئ جهة واحدة فقط — قد يكون الأنسب استخدام مسار الترحيل / الإعداد.',
            'This looks like a multi-entity group. Create Tenant provisions a single tenant — this may belong in the Migration / Onboarding Project flow instead.',
          )}
        </div>
      )}
    </div>
  );
};

const Card: React.FC<{ title: string; icon?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, action, children }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <div className="mb-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon} {title}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const Field: React.FC<{ label: string; value?: React.ReactNode; muted?: boolean }> = ({ label, value, muted }) =>
  value ? (
    <div className="flex justify-between gap-3 py-0.5 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className={`text-end ${muted ? 'text-slate-400' : 'font-medium'}`}>{value}</span>
    </div>
  ) : null;

const IdentityCard: React.FC<{ p: CompanyProfileResult; isAr: boolean; applied: boolean; onApply: () => void }> = ({ p, isAr, applied, onApply }) => {
  const wp = p.wizard_prefill;
  return (
    <Card
      title={tr(isAr, 'Identity', 'الهوية')}
      icon={<Building2 size={13} />}
      action={
        <button className={headerBtnPrimary} onClick={onApply}>
          <Check size={13} /> {applied ? tr(isAr, 'Re-apply', 'أعد التطبيق') : tr(isAr, 'Apply', 'تطبيق')}
        </button>
      }
    >
      <Field label={tr(isAr, 'Legal name', 'الاسم القانوني')} value={wp.legal_name_en} />
      <Field
        label={tr(isAr, 'Arabic name', 'الاسم بالعربية')}
        value={
          wp.name_ar ? (
            <span dir="rtl">
              {wp.name_ar}
              {!wp.name_ar_verified && (
                <span className="ms-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700">{tr(isAr, 'unverified', 'غير مؤكد')}</span>
              )}
            </span>
          ) : null
        }
      />
      <Field label={tr(isAr, 'Country', 'الدولة')} value={wp.country} />
      <Field label={tr(isAr, 'Industry', 'القطاع')} value={wp.industry} />
      <Field
        label={tr(isAr, 'Website', 'الموقع')}
        value={
          wp.website ? (
            <a href={wp.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1">
              {wp.website.replace(/^https?:\/\//, '').slice(0, 30)} <ExternalLink size={11} />
            </a>
          ) : null
        }
      />
      <div className="mt-1 text-[11px] text-slate-400">{tr(isAr, 'Applies identity fields only; frameworks/template come later.', 'يطبّق حقول الهوية فقط؛ الأطر/القالب لاحقًا.')}</div>
    </Card>
  );
};

const Chip: React.FC<{ children: React.ReactNode; tone?: 'green' | 'blue' | 'slate' }> = ({ children, tone = 'slate' }) => {
  const tones = {
    green: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    slate: 'bg-slate-100 text-slate-600',
  } as const;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
};

const RegulatorsCard: React.FC<{ p: CompanyProfileResult; isAr: boolean }> = ({ p, isAr }) => {
  const rc = p.regulatory_candidates;
  const signals: Array<[boolean, string]> = [
    [rc.is_regulated, tr(isAr, 'Regulated', 'خاضعة للرقابة')],
    [rc.is_financial_entity, tr(isAr, 'Financial entity', 'كيان مالي')],
    [rc.is_public_company, tr(isAr, 'Public company', 'شركة مساهمة')],
    [rc.is_government_owned, tr(isAr, 'Government-owned', 'مملوكة للدولة')],
  ];
  const on = signals.filter(([v]) => v);
  return (
    <Card title={tr(isAr, 'Regulators & signals', 'الجهات الرقابية')} icon={<ShieldCheck size={13} />}>
      <div className="mb-1 flex flex-wrap gap-1">
        {rc.regulators.length ? rc.regulators.map((r) => <Chip key={r} tone="blue">{r}</Chip>) : <span className="text-sm text-slate-400">{tr(isAr, 'none detected', 'لم تُكتشف جهة')}</span>}
      </div>
      <div className="flex flex-wrap gap-1">
        {on.map(([, label]) => <Chip key={label} tone="green">{label}</Chip>)}
      </div>
      <div className="mt-1 text-[11px] text-slate-400">{tr(isAr, 'Positive-only signals; absence ≠ a negative.', 'الإشارات إيجابية فقط؛ الغياب لا يعني النفي.')}</div>
    </Card>
  );
};

const DedupCard: React.FC<{ p: CompanyProfileResult; isAr: boolean }> = ({ p, isAr }) => {
  const dc = p.dedup_candidates;
  return (
    <Card title={tr(isAr, 'Duplicate hint', 'تلميح التكرار')} icon={<Search size={13} />}>
      {dc.possible_existing_tenant ? (
        <div className="mb-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {tr(isAr, 'Possible existing tenant — verified at Review before creating.', 'قد تكون جهة موجودة — يُفحص بدقّة قبل الإنشاء في المراجعة.')}
        </div>
      ) : (
        <div className="mb-1 text-[11px] text-slate-400">{tr(isAr, 'Early heads-up; the real check runs at Review.', 'تلميح مبكّر؛ الفحص الفعلي في خطوة المراجعة.')}</div>
      )}
      <Field label={tr(isAr, 'CR number', 'السجل التجاري')} value={dc.cr_number} />
      {dc.similar_names.length > 0 && (
        <div className="mt-1">
          <div className="text-xs text-slate-400">{tr(isAr, 'Similar names', 'أسماء مشابهة')}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {dc.similar_names.slice(0, 8).map((n, i) => <Chip key={i}>{n}</Chip>)}
          </div>
        </div>
      )}
    </Card>
  );
};

const HierarchyCard: React.FC<{ p: CompanyProfileResult; isAr: boolean }> = ({ p, isAr }) => {
  const h = p.hierarchy_candidates!;
  return (
    <Card title={tr(isAr, 'Corporate hierarchy', 'الهيكل المؤسسي')} icon={<Layers size={13} />}>
      <Field label={tr(isAr, 'Group', 'المجموعة')} value={h.group_name} />
      <Field label={tr(isAr, 'Legal entity', 'الكيان القانوني')} value={h.legal_entity_name} />
      {h.egx_ticker && <Field label="EGX" value={h.egx_ticker} />}
      {h.subsidiaries.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-slate-400">{tr(isAr, 'Subsidiaries', 'الشركات التابعة')} ({h.subsidiaries.length})</div>
          <ul className="mt-1 space-y-1">
            {h.subsidiaries.slice(0, 12).map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {s.name_en ?? s.name_ar}
                  {s.is_egx_listed && <span className="ms-1 text-[10px] text-blue-600">EGX</span>}
                </span>
                {s.source_url && (
                  <a href={s.source_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-emerald-600">
                    <ExternalLink size={11} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};

const Row: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
  <div className="flex justify-between border-b py-2">
    <span className="text-slate-500">{k}</span>
    <span className="font-medium">{v}</span>
  </div>
);

export default TenantProvisioningWizard;
