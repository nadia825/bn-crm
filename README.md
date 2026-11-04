# BN CRM v0

An interactive Bottle Nexus CRM prototype built with Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui-style Radix components, Lucide icons, and Recharts.

## Run locally

Requires Node.js 22.18 or newer. This command runs the browser-only demo; use Docker Compose below for the shared local database.

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

Open [BN CRM locally](http://localhost:3000). Compose starts:

- `app` (`bn-crm:local`): the UI served by non-root NGINX, retaining the existing `bn-crm` container name and local URL.
- `api` (`bn-crm-api:local`): a Node.js API with SQLite, reachable through the UI's `/api/` proxy. No API port is published.
- `crm-data`: a named volume holding `/data/bn-crm.sqlite` and its SQLite journal files. The first start seeds fictional records; subsequent starts retain edits.

The UI build runs the full test suite before generating the static export. No host Node installation is needed for Compose. The local stack does not change the published website or push images to a registry.

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

Then open `http://localhost:3001`. Use the same `BN_CRM_PORT` value for subsequent Compose commands. The local Docker URL does not require ChatGPT sign-in. The local stack uses one shared SQLite database across browsers, ports, hostnames and selected demo identities. Role projections still limit the records each identity sees. Changes refresh in other sessions about every 2.5 seconds or on window focus. Layout, navigation and selected identity remain browser preferences.

## Included workflows

- Dashboard with live mock totals, affiliate stages, operational distribution, activity, tasks, accounts, and urgent cases.
- Searchable, filterable, sortable, paginated account directory; profiles include contacts, retailers, commercial details, onboarding, linked work/cases, activity, notes, and file references. CSV export respects the active directory filters.
- Affiliate and supplier pipelines with separate stage definitions, manager filters, native drag-and-drop boards, and editable list stages. Account editing provides a keyboard-accessible alternative to dragging.
- Operational work, My Tasks, team tasks, support cases, create/edit forms, assignments, status changes, comments, history, and optional linked support cases. Resolving a case requires a resolution.
- Corporate brand setup with six mandatory requirements, a simulated verification delay, submission for Operations review, rejection with a reason, and approval/activation. Editing setup invalidates previous verification. Active brands are locked against checklist changes.
- Barrel tables/boards and editable records, contacts, reports and CSV export, workspace settings, notification preferences, reset confirmation, Brands, Affiliates, and Operations workspaces with distinct dashboards and navigation, global search (Cmd/Ctrl+K), and responsive navigation.

## Data and persistence

`src/lib/data.ts` defines the types, stage configurations, and consistent seed: 20 corporate brands, 35 affiliates, 12 suppliers, 15 retailers, 40 work items, 15 support cases, 20 barrels, and linked contacts and histories. Contact addresses use reserved `.example` domains.

`src/lib/store.tsx` reads `/runtime-config.json`. Compose serves `{"mode":"server"}`; the ordinary static export serves `{"mode":"browser"}`. In server mode it sends record patches to the API, confirms saves, refreshes other sessions, and rejects saves that conflict with a changed record. Optimistic edits roll back on failure; dependent pending edits are cancelled. Review the latest records and retry manually. Browser mode continues to store mock records under `bn-crm-v0`.

Existing browser demo data is preserved separately when switching to Compose. A System Admin can explicitly import it from Settings before the new database's first change. Import validates relationships and workflow rules; there is no automatic overwrite. After the first database change the import endpoint is locked. Settings → Reset demo data replaces shared business records across all local sessions while retaining audit history; it does not erase the old browser copy.

`src/components/` separates domain screens from shared UI primitives in `src/components/ui/`. `server/` supplies the local HTTP API, schema validation, SQLite migration and persistence. Role and workflow rules in `src/lib/mutations.ts` are shared with the API. SQLite transactions preserve cross-module links and commit audit entries with changes; record baselines prevent lost updates while a numeric revision tracks snapshot changes. Normalized tables enforce foreign keys and verified BNX ID uniqueness, with JSON payloads retaining the prototype record shape.

## Prototype boundaries

The Compose stack has a real local SQLite database and API, but uses fictional business records and selectable demo identities. There is no real authentication, external API integration, Shopify, Stripe, email delivery, or Bottle Nexus activation. Verification and Operations roles are simulated in the same session. Reminders are saved preferences surfaced in the notification panel; they do not schedule OS notifications. Attachments retain filenames only; sample file references contain no downloadable content. Historical analytics are explicitly illustrative, while current totals derive from shared state. Supplier stages and extra affiliate stages are managed in Configuration by the demo System Admin. Core affiliate stages and onboarding gates remain protected.

## Validation

Data integrity tests cover exact counts, unique IDs, all cross-module references, activation invariants, case resolutions, fictional contact domains, and independent supplier/affiliate workflows. Browser QA covers account creation and reload persistence, account notes, onboarding verification/rejection/activation, work editing, comments, case resolution, pipeline moves, and responsive navigation.

## Connected workspaces

The workspace switcher selects Brands, Affiliates, or Operations. Each has its own home dashboard, navigation, default account type, and scoped task/case lists. Brands owns corporate relationships and six-step onboarding. Affiliates owns acquisition, partner follow-ups, connected retailer relationships, and barrel activities. Operations owns team-wide business work, support, suppliers, barrels, and the brand approval queue. Company overview, Reports, Settings, and global search remain available across workspaces.

All workspaces use the same store and record IDs. Brand and affiliate directories filter the existing account type; tasks and cases are scoped through their linked account. Operations sees the complete set. Changing a case, completing a task, or approving a brand updates the same record in every applicable view. Submitting a verified brand queues it for Operations; approval or rejection happens in the Operations workspace. These are contextual workspaces, not separate databases or a production authorization boundary.

Workspace URLs use hashes such as `#brands/dashboard`, `#affiliates/accounts`, and `#operations/work-board`. Global URLs use `#company/overview`, `#company/reports`, and `#company/settings`. Older single-workspace links still resolve to their appropriate context. The selected workspace is remembered separately under `bn-crm-navigation`. Browser-only records in `bn-crm-v0` remain preserved separately when using Compose.

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

The shared state layer checks every business mutation against the selected demo user's fixed roles, record scope, protected relationships and activation requirements. Rejected mutations append denied audit events; the UI cannot supply trusted audit events or forge a new history entry's author. Financial values and screens are projected only for authorized demo roles. Compose enforces these checks again on the backend using the stored roles for `X-Demo-User`, and returns a role-filtered snapshot. The identity header is intentionally selectable in this local mock: **it is not authentication**. Anyone with access to the local demo can select an admin. Browser-only mode remains a UI simulation. Keep this loopback-bound stack for fictional testing.

`bn-crm-v0` remains version 1 with an additive migration, so prior accounts, notes and work remain intact. New demo identities, invoices, activities and configuration are added when missing. Existing assignments are preserved; migrated datasets may need Admin/Operations assignment to populate a newly introduced user's work list. `bn-crm-demo-user` stores the selected fictional identity, and `bn-crm-view:*` remembers the active saved view. The local API and SQLite persistence are implemented in Compose. External integrations, invitations, real payments and message delivery remain mocked.

The test suite also covers all role scopes, multi-role unions, denied writes, financial redaction, assignment restrictions, onboarding activation, verified duplicates, protected configuration, saved-view permissions and migration preservation.

## Provisional Suppliers

Suppliers remain an exploratory, provisional category. Their relationship with Corporate Brands and Affiliates has not been defined or validated. Supplier records, pipeline stages and supplier-to-barrel links are illustrative mock data, not an approved business model or live BNX integration. The directory, profiles, forms, Operations navigation and configuration screens label this status explicitly.


## Local database operations

`docker compose down` keeps the named database volume. **Do not use `docker compose down -v` unless you intend to delete the database.** Rebuilding images does not reseed an existing database.

Create a consistent live backup (choose a fresh filename each time):

```sh
mkdir -p backups
docker compose exec -T api node --experimental-strip-types server/backup.ts /tmp/bn-crm-backup-20261029.sqlite
docker compose exec -T api cat /tmp/bn-crm-backup-20261029.sqlite > backups/bn-crm-backup-20261029.sqlite
```

Use SQLite's backup output rather than copying a live `.sqlite` file without its WAL journal. Backups and local database files are ignored by Git and Docker builds. `server/backup.ts` refuses to overwrite an existing destination.

`npm run dev:api` runs the API directly at `127.0.0.1:3001` with `.local-data/bn-crm.sqlite`; `BN_CRM_DB_PATH`, `HOST` and `PORT` can override defaults. The ordinary Next dev server stays in browser mode; use Compose to exercise the full same-origin stack.

API endpoints: `GET /api/health`, `GET /api/demo-users`, `GET /api/state`, `PATCH /api/state`, `POST /api/import`, and `POST /api/reset`. State reads and writes require a selected demo ID in `X-Demo-User`. Writes require JSON and the current revision. Reset/import require a System Admin. API and database failures are surfaced in the UI without silently falling back to browser storage.

## Local stack acceptance checks

Run `npm run typecheck`, `npm run test:data`, and `npm run build`. API tests use temporary SQLite databases and localhost servers; they never reset the running Compose database. They cover persistence, foreign keys, role redaction, backend write denials, onboarding gates, duplicates, invalid payloads, imports, resets, same-origin writes and conflicting revisions.

Manual steps supplement the existing 30 business scripts in `tests/manual/`. See `tests/manual/local-database.md` for the changed persistence expectations, cross-session checks, restart/backup procedures and failure scenarios. Hosted browser-only tests still expect separate browser storage.

## Daily work and scaling improvements

Dashboards open with **Needs your attention**, scoped to the current workspace and role. It prioritizes overdue work, blockers, brand approval decisions and account follow-ups. Filters include My work, Overdue, Blocked and Approvals. Dates use the browser's current calendar date rather than a fixed demo date.

New work and support forms default to today and the selected identity. Creating work from an account profile preselects that account. Category, status, case links and file references are grouped under More options; existing values stay mounted and are submitted even when collapsed. The form body scrolls independently so Cancel and Save remain visible.

Select task or case checkboxes in a board or list to change status and priority together. System Admins and Operations Managers can also assign selected work to an active user. Resolving or closing cases still requires a resolution; a shared resolution can be entered in the bulk toolbar. The complete selection saves atomically. Selection clears when filters change. Authorized account directories support assigning an owner to selected accounts on the current page; selection clears on page changes.

API writes compare each changed record with its submitted baseline. An unrelated change in another session no longer rejects the save, but an edit to the same record still returns HTTP 409. Open forms retain their initial record baseline and check it before saving. Reset and import continue to require the exact shared revision. SQLite saves delete removed records and upsert changed records instead of clearing and rebuilding every table. Foreign keys remain enforced at transaction commit.

Screens and editors load on demand. Store consumers subscribe to selected fields; connection/save status renders separately from the workspace. API snapshots retain unchanged collection and record references, unchanged polls avoid full database reads, overlapping refreshes are prevented, and hidden tabs pause interval polling.

Additional acceptance checks: `tests/optimizations.test.mjs` and the concurrency, incremental-write and atomic bulk scenarios in `tests/local-api.test.mjs`. Manual UI checks are in `tests/manual/optimizations.md`.
