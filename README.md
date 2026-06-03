# Comply.now · Pianat Admin (standalone)

The platform-operator console, extracted into its own app so the admin UI is
**never shipped to customer browsers**. It talks to the **same NestJS backend**
as the customer app and is gated to the `platform_operator` archetype.

- Stack: Vite + React 18 + TypeScript + Tailwind + Bootstrap CSS + react-router.
- Auth: `POST /auth/loginDemo` → Bearer token in `localStorage` → sent on every
  `/api/pianat-admin/*` call. The backend `@PlatformOperatorOnly` guard is the
  real boundary; the login screen + `PlatformOperatorGate` also reject non-operators.

## Run

```bash
cd F:\pianat\pianat_admin_frontend
npm install
npm run dev          # http://localhost:3100
```

Backend must be running on `http://localhost:5040` (override via `.env` →
`VITE_API_URL`). `localhost:3100` is already in the backend's CORS allow-list.

Log in with a platform_operator account (from the demo seed):
`org = pianat`, `user = pianat_admin`, `password = Demo@1234`.

## Pages (mounted under /pianat-admin/*)

- `/pianat-admin/tenants` — tenant list + filters
- `/pianat-admin/tenants/new` — provisioning wizard
- `/pianat-admin/tenants/:id` — tenant detail + Configuration tab
- `/pianat-admin/tenant-templates` — templates list + create/edit
- `/pianat-admin/audit` — cross-tenant audit + CSV export
- `/pianat-admin/metrics` — platform metrics + tenant health + insights
- `/pianat-admin/billing` — MRR by plan

## Relationship to the customer app

The same pages still exist (gated) inside `new_front_compliance`. This app is the
**deployment-separated** copy. When you cut over, remove the Pianat Admin routes/
section from the customer app so its bundle no longer carries them. Shared code
(`apiClient`, `rootEntity` types, the page-shell helpers) is currently duplicated;
promote it to a shared package if/when you formalise a monorepo.
