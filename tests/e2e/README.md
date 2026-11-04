# Automated user journeys

These Playwright tests operate the CRM through visible controls: changing roles,
navigating workspaces, filling forms, selecting options, saving, and reloading.
The UI runs from a fresh production export against the real CRM HTTP API and SQLite.

## Run

For one command that performs the checks and creates a detailed scenario report:

```sh
npm run test:scenarios
```

This runs TypeScript checks, data/API tests, a fresh production build and 19
scenarios on both browser profiles (38 executions): eight role/navigation checks,
eight original workflows and three complex workflows. These counts describe
different depths of coverage; role navigation is not a complete business journey. The console
prints the report's absolute path. Each execution gets a new dated folder under
`reports/user-journeys/`, containing:

- `report.html`: a standalone report you can open directly in a browser, search,
  filter by outcome, expand and print or save as PDF.
- `report.json`: the same results as structured data for further processing.
- `logs/`: complete logs for each command.
- `artifacts/`: the Playwright report, raw results, and failure screenshots,
  videos and traces.
- `sources/`: plaintext copies of executable test files (`.txt`) and a SHA-256 manifest. Recorded source
  locations link to these copies where available. The runner marks the report
  Failed if an executable test source changes during the run.

Every scenario lists its roles, browser profile, numbered actions, expected
results, actual pass/fail outcomes, assertion details and timings. Retries retain
every attempt and are labelled Flaky. Steps not reached after a failure remain in
the report as Not run; skipped and interrupted work is never labelled Passed.
If the build fails, the report still includes all planned scenarios and steps,
with the browser phase explicitly marked as not run.

The report separates **planned instructions** from **recorded execution**:

- Recorded browser/API operations come from Playwright, with actual locators,
  entered values/arguments when supplied by the runner, timings and source locations.
  Playwright may omit or truncate some arguments; the report does not invent them.
- Explicit comparisons record the value actually read during assertion polling
  alongside its expected value. Critical saves are also checked against the real
  test API, rather than inferred from a closed dialog or a success message.
- Page checkpoints record session identity, URL, form values and saved comments
  after each business step. They describe that moment, not intermediate states.
- Action-only steps are labelled as such. A completed action alone does not prove
  every phrase in a written expected result. Skipped/unreached steps stay distinct.
- The complex invalid-batch probe explicitly sends an API request; it is labelled
  as backend validation rather than a user action. Other business writes use the UI.

The script exits with code 0 only when all checks and scenarios pass. Failure,
flakiness or incomplete execution produces a nonzero exit code; interruption
returns 130. It writes results incrementally and keeps earlier report folders.
`reports/user-journeys/latest.json` points to the latest completed run.

Requires Node.js 22.18 or newer, the project dependencies, and Chromium:

```sh
npm ci
npx playwright install chromium
npm run test:e2e
```

`npm run test:all` also runs TypeScript, data/API tests, the production build, and these
browser journeys. The GitHub Actions workflow runs `npm run test:scenarios` on main
pushes, pull requests, or a manual workflow dispatch once pushed to GitHub.

For focused development after a successful build:

```sh
npm run test:e2e:run -- --project=desktop-chromium
npm run test:e2e:run -- --grep "Sales hands"
npm run test:e2e:ui
npm run test:e2e:report
```

Use `test:e2e` after application changes; `test:e2e:run` deliberately uses the
existing `out/` build. No test results are inferred from an older build.

## Covered journeys

Every test runs in desktop Chromium and Chromium with a Pixel 7 viewport, touch,
and device settings. These are mobile browser emulation, not physical device tests.

| Journey | Checks |
| --- | --- |
| Eight demo identities | Role-specific navigation, restricted administration, selected identity and route surviving reload |
| Sales → Account Manager | Brand creation, ownership handoff, account notes, updates reaching an already-open independent session, reload persistence |
| Account Manager → Operations | Incomplete setup gates, all six checks, verification, submission, rejection reason, feedback, correction, resubmission, activation and locked checks |
| Operations → assigned member | Support case, linked work prefilled with the right account/case, assignment, comment, completion, required resolution and persisted case outcome |
| Team bulk work | Search, selecting two requests, persisted status/priority updates, leaving unselected work intact, combining/clearing filters |
| Concurrent account edits | Two independent people open forms; an outdated edit cannot overwrite the accepted save |
| Network failure/recovery | Aborted save, visible error, optimistic rollback, reconnect, retry and persisted note |
| Viewer | Only designated brands, disabled creation/editing and no note saves |
| Personal working list and export | Saved filters survive reload, default/saved views restore correctly, keyboard menu dismissal, downloaded CSV contains only filtered accounts |
| Complex account ownership handoff | Three independent identities, former-owner access revocation, new-owner visibility, preserved notes, original record IDs and linked task assignment |
| Complex bulk case resolution | Disabled UI without a resolution, explicit invalid API batch rejected with no revision/record changes, valid UI bulk save, persisted selected outcomes, untouched control record |
| Complex shared views | Same shared filter across Admin, Account Manager and Viewer, persisted filter, restricted deletion, scoped API projections and a header-only export for inaccessible records |

The work/case journeys also assert that the page fits the device viewport before
opening forms. This catches hidden form controls that accidentally widen the page
and make mobile modal actions unreachable.

The original manual scripts are in `tests/manual/uat-cases.json`; these journeys
automate selected flows from BN-01–06, BN-10–12, BN-15–17, BN-25, BN-27 and related local database
acceptance checks. They do not mark the 30 manual scripts as executed or replace
all of their individual assertions.

## Isolation and evidence

Each test creates a new SQLite file in the OS temporary directory and serves the
CRM on a randomly assigned `127.0.0.1` port. Additional people use separate browser
contexts connected to that test's database. Ports, records and browser storage are
isolated across tests. Teardown closes connections and deletes the temporary file.
Global setup snapshots `out/` into a temporary directory for the run, so a later
local build cannot remove or replace the browser's assets during a journey.
There is no external target URL option; these tests never reset the running
Compose database or touch the published site.

Business writes use the UI except the explicitly labelled negative API probe in
JOURNEY-10. The network recovery test deliberately aborts browser
state requests to simulate connectivity failure; the other workflows use the real
API without mocked success responses. Assertions wait for observable results, not
fixed sleeps. Uncaught browser exceptions fail the test.

The HTML report is in `playwright-report/`; JSON results are in
`test-results/results.json`. Failed tests retain screenshots, video and Playwright
traces, including actions in additional user sessions. Use the HTML report or
`npx playwright show-trace <trace.zip>` to inspect failures. CI retains reports for
14 days. Generated reports are ignored by Git and Docker.

The business steps are defined in `scenario-plan.mjs` and executed with
`stepsFor()`/`scenarioTest()` in the test specs. Keep the plan and executable steps
together when adding scenarios. A runner success with a missing planned step is
reported as Failed. The custom reporter also produces a business report during
ordinary Playwright runs under `test-results/scenario-report/` (or the selected
artifact directory); scenarios excluded by a test filter remain Not run.

When running multiple suites at the same time, give each run a different artifact
directory so one process cannot clean another process's traces:

```sh
BN_CRM_E2E_ARTIFACTS=.e2e-runs/my-run npm run test:e2e
npx playwright show-report .e2e-runs/my-run/playwright-report
```

The suite does not exercise real authentication, payments, email delivery or BNX
integrations, which the application currently simulates. Safari/Firefox, physical
devices, full accessibility audits, load testing and subjective usability remain
outside this suite.

Still outside browser workflow coverage: the full affiliate acquisition lifecycle,
invoice/payment reconciliation, BNX duplicate handling, role-administration changes
and every variation in the manual UAT catalog. Some rules have lower-level data/API
tests; that does not count as browser journey coverage. Complex concurrency testing
also remains bounded to the defined two/three-person scenarios, not a load test.
