/**
 * /pianat-admin/tenants/new — tenant provisioning wizard.
 *
 * Journey: Company → Template → Identity → Modules → Frameworks → AI Agents →
 * Limits → Subscription → Admin → Review.
 *
 * The Company step runs the async "Company Profiler" (onboarding intelligence):
 * the moment ops enters a company name it profiles the firm in the background
 * (identity, regulators, classification, dedup, hierarchy) WITHOUT blocking the
 * wizard. Everything it returns is a SUGGESTION ops reviews and applies — it
 * never creates, merges, or classifies anything on its own.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';
import {
  CompanyProfileResult,
  CompanyProfileRun,
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

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Named step indices so the per-step logic doesn't drift when steps move.
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

  // ── Company Profiler state ──────────────────────────────────────────────
  const [companyName, setCompanyName] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [run, setRun] = useState<CompanyProfileRun | null>(null);
  const [profErr, setProfErr] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const profileIdRef = useRef<string | null>(null);

  const startProfiling = async () => {
    const n = companyName.trim();
    if (!n) return;
    setProfErr(null);
    setApplied(false);
    setRun(null);
    try {
      const { id } = await startCompanyProfile(n);
      profileIdRef.current = id;
      setProfileId(id);
    } catch (e: any) {
      setProfErr(e?.message ?? 'Could not start the profiler.');
    }
  };

  // Poll while the run is active. Non-blocking — ops can move through the wizard
  // while this runs; the suggestions just keep refreshing in the background.
  useEffect(() => {
    if (!profileId) return;
    const status = run?.status;
    if (status && !ACTIVE_STATUSES.includes(status)) return; // terminal — stop polling
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
      setRun((r) => (r ? { ...r, status: 'profiling_b' } : r)); // resume polling
    } catch (e: any) {
      setProfErr(e?.message ?? 'Could not request deeper profiling.');
    }
  };

  const applyProfile = () => {
    const p = run?.profile;
    if (!p) return;
    const wp = p.wizard_prefill;
    const validFw = new Set(FRAMEWORKS);
    const fws = (wp.suggested_frameworks ?? []).filter((f) => validFw.has(f));
    const patch: Partial<ProvisionTenantInput> = {};
    const legalName = wp.legal_name_en || companyName.trim();
    if (legalName) {
      patch.name = legalName;
      patch.slug = form.slug || slugify(legalName);
    }
    if (wp.name_ar) patch.name_ar = wp.name_ar;
    if (wp.industry) patch.industry = wp.industry;
    if (fws.length) patch.active_frameworks = Array.from(new Set([...form.active_frameworks, ...fws]));
    set(patch);
    setApplied(true);
  };

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

  /** Toggle a module, auto-enabling its dependencies (server re-validates). */
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
    setBusy(true);
    setError(null);
    try {
      const result = await provisionTenant({
        ...form,
        ui_direction: form.default_language === 'ar' ? 'rtl' : 'ltr',
      });
      navigate(`/pianat-admin/tenants/${result?.tenant_id ?? result?.id ?? ''}`);
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
    // Carry the company name into Identity if ops never applied a profile.
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
      {/* Stepper */}
      <Panel className="mb-4 overflow-x-auto">
        <div className="flex items-center gap-1 text-xs">
          {STEPS.map(([en, ar], i) => (
            <React.Fragment key={en}>
              <button
                className={`flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 ${
                  i === step ? 'bg-violet-600 text-white' : i < step ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-400'
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
                <Sparkles size={18} className="text-violet-600" />
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
                    placeholder={tr(isAr, 'مثال: مدينة نصر للإسكان والتعمير', 'e.g. Madinet Nasr for Housing & Development')}
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

              {profileId && <ProfilerPanel run={run} isAr={isAr} applied={applied} onApply={applyProfile} onDeepen={deepen} />}

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
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(templates.data ?? []).map((tpl) => (
                  <button key={tpl.id} className="rounded-2xl border border-slate-200 p-4 text-start hover:border-violet-400" onClick={() => applyTemplate(tpl)}>
                    <div className="font-semibold">{tpl.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{tpl.description}</div>
                    <div className="mt-2 text-xs text-violet-600">{tpl.archetype}</div>
                  </button>
                ))}
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
                <label className="form-label">{tr(isAr, 'Name (EN)', 'الاسم')} *</label>
                <input className="form-control" value={form.name}
                  onChange={(e) => set({ name: e.target.value, slug: form.slug || slugify(e.target.value) })} />
              </div>
              <div>
                <label className="form-label">{tr(isAr, 'Name (AR)', 'الاسم بالعربية')}</label>
                <input className="form-control" dir="rtl" value={form.name_ar ?? ''} onChange={(e) => set({ name_ar: e.target.value })} />
              </div>
              <div>
                <label className="form-label">{tr(isAr, 'Slug', 'المعرّف')} *</label>
                <input className="form-control" value={form.slug} onChange={(e) => set({ slug: e.target.value })} />
              </div>
              <div>
                <label className="form-label">{tr(isAr, 'Archetype', 'النوع')}</label>
                <select className="form-select" value={form.archetype} onChange={(e) => set({ archetype: e.target.value, enabled_modules: [] })}>
                  {ARCHETYPES.map((a) => <option key={a} value={a}>{a}</option>)}
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
                <label className="form-label">{tr(isAr, 'Industry', 'القطاع')}</label>
                <input className="form-control" value={form.industry ?? ''} onChange={(e) => set({ industry: e.target.value })} />
              </div>
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
                  <label key={m.module_key} className={`flex cursor-pointer items-start gap-2 rounded-xl border p-2 text-sm ${form.enabled_modules.includes(m.module_key) ? 'border-violet-400 bg-violet-50' : 'border-slate-200'}`}>
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
            <div className="grid gap-2 md:grid-cols-3">
              {FRAMEWORKS.map((f) => (
                <label key={f} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2 text-sm ${form.active_frameworks.includes(f) ? 'border-violet-400 bg-violet-50' : 'border-slate-200'}`}>
                  <input type="checkbox" checked={form.active_frameworks.includes(f)} onChange={() => toggleIn('active_frameworks', f)} />
                  {f}
                </label>
              ))}
            </div>
          )}

          {/* Step 5 — AI agents */}
          {step === STEP.Agents && (
            <div className="grid gap-2 md:grid-cols-2">
              {AI_AGENTS.map((a) => (
                <label key={a} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2 text-sm ${form.enabled_ai_agents.includes(a) ? 'border-violet-400 bg-violet-50' : 'border-slate-200'}`}>
                  <input type="checkbox" checked={form.enabled_ai_agents.includes(a)} onChange={() => toggleIn('enabled_ai_agents', a)} />
                  {a.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          )}

          {/* Step 6 — Limits */}
          {step === STEP.Limits && (
            <div className="grid gap-3 md:grid-cols-2">
              {LIMIT_KEYS.map((k) => (
                <div key={k}>
                  <label className="form-label">{k.replace(/_/g, ' ')}</label>
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
                  {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
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
              <Row k={tr(isAr, 'Name', 'الاسم')} v={`${form.name} (${form.slug})`} />
              <Row k={tr(isAr, 'Archetype', 'النوع')} v={form.archetype} />
              <Row k={tr(isAr, 'Language', 'اللغة')} v={form.default_language} />
              <Row k={tr(isAr, 'Modules', 'الوحدات')} v={`${form.enabled_modules.length}`} />
              <Row k={tr(isAr, 'Frameworks', 'الأطر')} v={form.active_frameworks.join(', ') || '—'} />
              <Row k={tr(isAr, 'AI agents', 'وكلاء الذكاء')} v={form.enabled_ai_agents.join(', ') || '—'} />
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
              <button className="btn btn-success" disabled={busy} onClick={submit}>
                {busy ? tr(isAr, 'Creating…', 'جارٍ الإنشاء…') : tr(isAr, 'Create tenant', 'إنشاء الجهة')}
              </button>
            )}
          </div>
        </Panel>
      )}
    </PianatShell>
  );
};

// ── Profiler suggestions panel ──────────────────────────────────────────────

const ProfilerPanel: React.FC<{
  run: CompanyProfileRun | null;
  isAr: boolean;
  applied: boolean;
  onApply: () => void;
  onDeepen: () => void;
}> = ({ run, isAr, applied, onApply, onDeepen }) => {
  const status = run?.status ?? 'queued';
  const profile = run?.profile ?? null;
  const isActive = ACTIVE_STATUSES.includes(status);

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
    <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
      {/* Status + review banner */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-violet-800">
          {isActive ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {statusLabel}
          {profile && (
            <span className="text-xs font-normal text-slate-500">
              · {tr(isAr, 'confidence', 'الثقة')} {Math.round((profile.confidence ?? 0) * 100)}% · {profile.match_status}
            </span>
          )}
        </div>
        {profile && (
          <div className="flex items-center gap-2">
            <button className={headerBtnPrimary} onClick={onApply}>
              <Check size={13} /> {applied ? tr(isAr, 'Applied — re-apply', 'تم التطبيق — أعد') : tr(isAr, 'Apply suggestions', 'طبّق الاقتراحات')}
            </button>
          </div>
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
          {tr(isAr, 'يعمل في الخلفية — يمكنك المتابعة.', 'Working in the background — feel free to continue.')}
        </div>
      )}

      {profile && (
        <div className="grid gap-3 md:grid-cols-2">
          <IdentityCard p={profile} isAr={isAr} />
          <RegulatorsCard p={profile} isAr={isAr} />
          <ClassificationCard p={profile} isAr={isAr} status={status} onDeepen={onDeepen} />
          <DedupCard p={profile} isAr={isAr} />
          {profile.hierarchy_candidates && <HierarchyCard p={profile} isAr={isAr} />}
        </div>
      )}

      {profile && (profile.inaccessible_urls.length > 0 || profile.web_search_note) && (
        <div className="mt-3 text-xs text-slate-400">
          {profile.web_search_note && <div>{profile.web_search_note}</div>}
          {profile.inaccessible_urls.length > 0 && (
            <div>{tr(isAr, 'تعذّر فتح', 'Could not open')}: {profile.inaccessible_urls.length} {tr(isAr, 'رابط', 'url(s)')}</div>
          )}
        </div>
      )}
    </div>
  );
};

const Card: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
      {icon} {title}
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

const IdentityCard: React.FC<{ p: CompanyProfileResult; isAr: boolean }> = ({ p, isAr }) => {
  const wp = p.wizard_prefill;
  return (
    <Card title={tr(isAr, 'Identity', 'الهوية')} icon={<Building2 size={13} />}>
      <Field label={tr(isAr, 'Legal name', 'الاسم القانوني')} value={wp.legal_name_en} />
      <Field
        label={tr(isAr, 'Arabic name', 'الاسم بالعربية')}
        value={
          wp.name_ar ? (
            <span dir="rtl">
              {wp.name_ar}
              {!wp.name_ar_verified && (
                <span className="ms-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700">{tr(isAr, 'غير مؤكد', 'unverified')}</span>
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
        {rc.regulators.length ? rc.regulators.map((r) => <Chip key={r} tone="blue">{r}</Chip>) : <span className="text-sm text-slate-400">{tr(isAr, 'لم تُكتشف جهة', 'none detected')}</span>}
      </div>
      <div className="flex flex-wrap gap-1">
        {on.map(([, label]) => <Chip key={label} tone="green">{label}</Chip>)}
      </div>
      <div className="mt-1 text-[11px] text-slate-400">{tr(isAr, 'الإشارات إيجابية فقط؛ الغياب لا يعني النفي.', 'Positive-only signals; absence ≠ a negative.')}</div>
    </Card>
  );
};

const ClassificationCard: React.FC<{ p: CompanyProfileResult; isAr: boolean; status: string; onDeepen: () => void }> = ({ p, isAr, status, onDeepen }) => {
  const sc = p.suggested_classification;
  const isEnterprise = sc.value === 'enterprise';
  return (
    <Card title={tr(isAr, 'Suggested classification', 'التصنيف المقترح')} icon={<Sparkles size={13} />}>
      <div className="mb-1 flex items-center gap-2">
        <span className={`rounded-md px-2 py-0.5 text-sm font-semibold ${isEnterprise ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
          {isEnterprise ? tr(isAr, 'Enterprise', 'مؤسسي') : tr(isAr, 'Simple', 'بسيط')}
        </span>
        {sc.hard_trigger_hit && <Chip tone="green">{tr(isAr, 'مُحفّز', 'hard trigger')}</Chip>}
      </div>
      {sc.hard_trigger_reason && <div className="text-sm text-slate-600">{sc.hard_trigger_reason}</div>}
      {sc.rationale && <div className="mt-1 text-xs text-slate-500">{sc.rationale}</div>}
      <div className="mt-1 text-[11px] italic text-slate-400">{sc.no_downgrade_note}</div>
      {status === 'stage_a_done' && (
        <button className="btn btn-outline-primary btn-sm mt-2" onClick={onDeepen}>
          {tr(isAr, 'Deepen profile (Stage B)', 'تحليل أعمق (المرحلة ب)')}
        </button>
      )}
    </Card>
  );
};

const DedupCard: React.FC<{ p: CompanyProfileResult; isAr: boolean }> = ({ p, isAr }) => {
  const dc = p.dedup_candidates;
  return (
    <Card title={tr(isAr, 'Duplicate check', 'فحص التكرار')} icon={<Search size={13} />}>
      {dc.possible_existing_tenant && (
        <div className="mb-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" />
          {tr(isAr, 'قد تكون جهة موجودة بالفعل — تحقّق قبل الإنشاء.', 'Possible existing tenant — check before creating.')}
        </div>
      )}
      <Field label={tr(isAr, 'CR number', 'السجل التجاري')} value={dc.cr_number} />
      {dc.similar_names.length > 0 && (
        <div className="mt-1">
          <div className="text-xs text-slate-400">{tr(isAr, 'أسماء مشابهة', 'Similar names')}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {dc.similar_names.slice(0, 8).map((n, i) => <Chip key={i}>{n}</Chip>)}
          </div>
        </div>
      )}
      {!dc.possible_existing_tenant && !dc.cr_number && dc.similar_names.length === 0 && (
        <div className="text-sm text-slate-400">{tr(isAr, 'لا مرشحات مكررة.', 'No duplicate candidates.')}</div>
      )}
    </Card>
  );
};

const HierarchyCard: React.FC<{ p: CompanyProfileResult; isAr: boolean }> = ({ p, isAr }) => {
  const h = p.hierarchy_candidates!;
  return (
    <Card title={tr(isAr, 'Corporate hierarchy', 'الهيكل المؤسسي')} icon={<Building2 size={13} />}>
      <Field label={tr(isAr, 'Group', 'المجموعة')} value={h.group_name} />
      <Field label={tr(isAr, 'Legal entity', 'الكيان القانوني')} value={h.legal_entity_name} />
      {h.egx_ticker && <Field label="EGX" value={h.egx_ticker} />}
      {h.subsidiaries.length > 0 && (
        <div className="mt-2">
          <div className="text-xs text-slate-400">{tr(isAr, 'الشركات التابعة', 'Subsidiaries')} ({h.subsidiaries.length})</div>
          <ul className="mt-1 space-y-1">
            {h.subsidiaries.slice(0, 12).map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-sm">
                <span>
                  {s.name_en ?? s.name_ar}
                  {s.is_egx_listed && <span className="ms-1 text-[10px] text-blue-600">EGX</span>}
                </span>
                {s.source_url && (
                  <a href={s.source_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-violet-600">
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
