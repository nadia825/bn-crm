# BN CRM v0

An interactive Bottle Nexus CRM prototype built with Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui-style Radix components, Lucide icons, and Recharts.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. The application is a static-export-compatible client workspace. Hash URLs preserve each module on reload and support browser back/forward navigation.

```sh
npm run typecheck
npm run test:data
npm run build
```

The production static export is generated in `out/`.

## Included workflows

- Dashboard with live mock totals, affiliate stages, operational distribution, activity, tasks, accounts, and urgent cases.
- Searchable, filterable, sortable, paginated account directory; profiles include contacts, retailers, commercial details, onboarding, linked work/cases, activity, notes, and file references. CSV export respects the active directory filters.
- Affiliate and supplier pipelines with separate stage definitions, manager filters, native drag-and-drop boards, and editable list stages. Account editing provides a keyboard-accessible alternative to dragging.
- Operational work, My Tasks, team tasks, support cases, create/edit forms, assignments, status changes, comments, history, and optional linked support cases. Resolving a case requires a resolution.
- Corporate brand setup with six mandatory requirements, a simulated verification delay, submission for Operations review, rejection with a reason, and approval/activation. Editing setup invalidates previous verification. Active brands are locked against checklist changes.
- Barrel tables/boards and editable records, contacts, reports and CSV export, workspace settings, notification preferences, reset confirmation, workspace views, global search (Cmd/Ctrl+K), and responsive navigation.

## Data and persistence

`src/lib/data.ts` defines the types, stage configurations, and consistent seed: 20 corporate brands, 35 affiliates, 12 suppliers, 15 retailers, 40 work items, 15 support cases, 20 barrels, and linked contacts and histories. Contact addresses use reserved `.example` domains.

`src/lib/store.tsx` owns shared React state and persists it under `bn-crm-v0` in localStorage. Settings → Reset demo data restores the seed. State is browser-local and is not shared between users, devices, or origins.

`src/components/` separates domain screens from shared UI primitives in `src/components/ui/`. Replace store actions with API-backed mutations when adding a backend.

## Prototype boundaries

No real authentication, database, external APIs, Shopify, Stripe, email delivery, or Bottle Nexus activation. Verification and Operations roles are simulated in the same session. Reminders are saved preferences surfaced in the notification panel; they do not schedule OS notifications. Attachments retain filenames only; sample file references contain no downloadable content. Historical analytics are explicitly illustrative, while current totals derive from shared state. Supplier stages are configured centrally in `data.ts`.

## Validation

Data integrity tests cover exact counts, unique IDs, all cross-module references, activation invariants, case resolutions, fictional contact domains, and independent supplier/affiliate workflows. Browser QA covers account creation and reload persistence, account notes, onboarding verification/rejection/activation, work editing, comments, case resolution, pipeline moves, and responsive navigation.
