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

## Run with Docker

Requires Docker Engine with Compose (Docker Desktop or OrbStack on macOS). From this project directory:

```sh
docker compose up -d --build --wait
```

Open [BN CRM locally](http://localhost:3000). The container is named `bn-crm` and the image is `bn-crm:local`. The build installs the locked dependencies, runs the data-integrity tests, builds Next.js, and copies the static export into a small, non-root NGINX runtime. Node.js is only needed inside the build image.

```sh
docker compose ps                 # Container health and port
docker compose logs -f            # Server logs
docker compose stop               # Stop, keeping the container
docker compose start --wait       # Start it again
docker compose down              # Remove the container and Compose network
docker compose up -d --build --wait # Rebuild after source changes
```

Port 3000 is bound to this machine's loopback interface. If it is already occupied:

```sh
BN_CRM_PORT=3001 docker compose up -d --build --wait
```

Then open `http://localhost:3001`. Use the same `BN_CRM_PORT` value for subsequent Compose commands. The local Docker URL does not require ChatGPT sign-in. No database or volume is required: mock records persist in the browser's localStorage, even when the container is recreated. Different browsers, ports, and hostnames (`localhost` versus `127.0.0.1`) have separate records. Use the same local URL consistently.

## Included workflows

- Dashboard with live mock totals, affiliate stages, operational distribution, activity, tasks, accounts, and urgent cases.
- Searchable, filterable, sortable, paginated account directory; profiles include contacts, retailers, commercial details, onboarding, linked work/cases, activity, notes, and file references. CSV export respects the active directory filters.
- Affiliate and supplier pipelines with separate stage definitions, manager filters, native drag-and-drop boards, and editable list stages. Account editing provides a keyboard-accessible alternative to dragging.
- Operational work, My Tasks, team tasks, support cases, create/edit forms, assignments, status changes, comments, history, and optional linked support cases. Resolving a case requires a resolution.
- Corporate brand setup with six mandatory requirements, a simulated verification delay, submission for Operations review, rejection with a reason, and approval/activation. Editing setup invalidates previous verification. Active brands are locked against checklist changes.
- Barrel tables/boards and editable records, contacts, reports and CSV export, workspace settings, notification preferences, reset confirmation, Brands, Affiliates, and Operations workspaces with distinct dashboards and navigation, global search (Cmd/Ctrl+K), and responsive navigation.

## Data and persistence

`src/lib/data.ts` defines the types, stage configurations, and consistent seed: 20 corporate brands, 35 affiliates, 12 suppliers, 15 retailers, 40 work items, 15 support cases, 20 barrels, and linked contacts and histories. Contact addresses use reserved `.example` domains.

`src/lib/store.tsx` owns shared React state and persists it under `bn-crm-v0` in localStorage. Settings → Reset demo data restores the seed. State is browser-local and is not shared between users, devices, or origins.

`src/components/` separates domain screens from shared UI primitives in `src/components/ui/`. Replace store actions with API-backed mutations when adding a backend.

## Prototype boundaries

No real authentication, database, external APIs, Shopify, Stripe, email delivery, or Bottle Nexus activation. Verification and Operations roles are simulated in the same session. Reminders are saved preferences surfaced in the notification panel; they do not schedule OS notifications. Attachments retain filenames only; sample file references contain no downloadable content. Historical analytics are explicitly illustrative, while current totals derive from shared state. Supplier stages and extra affiliate stages are managed in Configuration by the demo System Admin. Core affiliate stages and onboarding gates remain protected.

## Validation

Data integrity tests cover exact counts, unique IDs, all cross-module references, activation invariants, case resolutions, fictional contact domains, and independent supplier/affiliate workflows. Browser QA covers account creation and reload persistence, account notes, onboarding verification/rejection/activation, work editing, comments, case resolution, pipeline moves, and responsive navigation.

## Connected workspaces

The workspace switcher selects Brands, Affiliates, or Operations. Each has its own home dashboard, navigation, default account type, and scoped task/case lists. Brands owns corporate relationships and six-step onboarding. Affiliates owns acquisition, partner follow-ups, connected retailer relationships, and barrel activities. Operations owns team-wide business work, support, suppliers, barrels, and the brand approval queue. Company overview, Reports, Settings, and global search remain available across workspaces.

All workspaces use the same store and record IDs. Brand and affiliate directories filter the existing account type; tasks and cases are scoped through their linked account. Operations sees the complete set. Changing a case, completing a task, or approving a brand updates the same record in every applicable view. Submitting a verified brand queues it for Operations; approval or rejection happens in the Operations workspace. These are contextual workspaces, not separate databases or a production authorization boundary.

Workspace URLs use hashes such as `#brands/dashboard`, `#affiliates/accounts`, and `#operations/work-board`. Global URLs use `#company/overview`, `#company/reports`, and `#company/settings`. Older single-workspace links still resolve to their appropriate context. The selected workspace is remembered separately under `bn-crm-navigation`; the existing `bn-crm-v0` records are preserved with no reset or duplication.

## Role simulation and updated business modules

The header's **Demo role switcher** previews seven fixed roles plus Maya Robinson's **Account Manager + Finance** combination. It changes navigation, dashboards, visible records and actions immediately. Brands, Affiliates and Operations remain connected business workspaces within this shared application.

- System Admin: company dashboard, users with one or more fixed roles, shared views, selected account fields, pipeline configuration and critical-action audit history.
- Sales Manager: acquisition pipelines, account directories, Account Manager assignments and team activities.
- Account Manager: owned client accounts, follow-ups, meetings, notes and related tasks/cases.
- Operations Manager: team work, assignments, cases, onboarding and approval queue.
- Operations Member: assigned tasks/cases and assigned onboarding requirements.
- Finance: authorized accounts, billing cases, fictional invoices, payment follow-ups and finance reports.
- Viewer: designated account and report views with business editing disabled.

Accounts, work lists, pipelines, activities and role dashboards support saved personal views. System Admin can save shared views. Account and work tables provide column customization; dashboards provide widget selection. Filters and selected views are remembered per demo user. All Accounts includes Brands, Affiliates and Suppliers without duplicating their records. Retailer profiles link back to client accounts. Affiliate On Hold, Rejected and historical Inactive records appear under Alternative states, separately from the acquisition pipeline.

Known `BNX-*` identifiers are locally verified against fictional references. Duplicate names/emails warn in the account form, verified identifier collisions block saving, and verified identifiers cannot be changed. Example unlinked references are `BNX-BR-901` and `BNX-AF-901`. There is no actual BNX synchronization.

The shared state layer checks every business mutation against the selected demo user's fixed roles, record scope, protected relationships and activation requirements. Rejected mutations append denied audit events; the UI cannot supply trusted audit events or forge a new history entry's author. Financial values and screens are projected only for authorized demo roles. These checks demonstrate intended product behavior; all code and data still reside in the browser and are **not a security boundary or production authentication**.

`bn-crm-v0` remains version 1 with an additive migration, so prior accounts, notes and work remain intact. New demo identities, invoices, activities and configuration are added when missing. Existing assignments are preserved; migrated datasets may need Admin/Operations assignment to populate a newly introduced user's work list. `bn-crm-demo-user` stores the selected fictional identity, and `bn-crm-view:*` remembers the active saved view. No backend, API integration, external invitation, real payment or message delivery is implemented.

The test suite also covers all role scopes, multi-role unions, denied writes, financial redaction, assignment restrictions, onboarding activation, verified duplicates, protected configuration, saved-view permissions and migration preservation.
