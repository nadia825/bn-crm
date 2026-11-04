import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { randomUUID } from "node:crypto";
import { stripVTControlCharacters } from "node:util";
import { scenarios, browserProjects } from "./scenario-plan.mjs";

export const clean = (value) => stripVTControlCharacters(String(value ?? ""));
export const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const href = (path) => path.split(/[/\\]/).map(encodeURIComponent).join("/");
const errorText = (error) => clean(error?.stack || error?.message || error?.value || error || "");
const duration = (ms) => `${(ms / 1000).toFixed(2)}s`;

export function createReport(metadata = {}, projects = browserProjects) {
  return {
    version: 2,
    metadata: {
      title: "BN CRM — user scenario execution report",
      startedAt: new Date().toISOString(), timezone: "Africa/Tunis",
      scope: `${scenarios.filter(scenario => scenario.category === "Role/navigation").length} role/navigation checks, ${scenarios.filter(scenario => scenario.category === "Workflow").length} workflow scenarios and ${scenarios.filter(scenario => scenario.category === "Complex workflow").length} complex workflows, each on desktop Chromium and Pixel 7 browser emulation. This is not execution of every step in the 30 manual UAT scripts.`,
      environment: "Production static UI, real local API, separate temporary SQLite database per scenario; fictional demo identities.",
      ...metadata,
    },
    status: "Running", stages: [], errors: [],
    scenarios: projects.flatMap((project) => scenarios.map((scenario) => ({
      ...structuredClone(scenario), key: `${project.name}:${scenario.id}`, project: project.name,
      device: project.device, status: "Not run", attempts: [], durationMs: 0,
      steps: scenario.steps.map((step) => ({ ...step, status: "Not run", durationMs: 0, actual: "This step has not been executed." })),
    }))),
  };
}

function flatten(steps = []) {
  return steps.flatMap((step) => [step, ...flatten(step.steps)]);
}

function attachedJSON(steps, name) {
  return flatten(steps).flatMap(step => (step.attachments || []).filter(attachment => attachment.name === name).map(attachment => {
    const body = attachment.body || (attachment.path ? readFileSync(attachment.path) : undefined);
    if (!body) throw new Error(`Missing body for ${name} evidence.`);
    return JSON.parse(body.toString());
  }));
}

function parameters(value) {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value, (_, item) => item instanceof RegExp ? String(item) : item));
}

export function recordAttempt(entry, result, directory) {
  const executed = flatten(result.steps).filter((step) => step.category === "test.step" && /^\[[\w-]+\] /.test(step.title));
  const errors = (result.errors || []).map(errorText);
  const steps = entry.steps.map((planned) => {
    const actual = executed.find((step) => step.title.startsWith(`[${planned.id}] `));
    if (!actual) return { id: planned.id, status: "Not run", durationMs: 0, actual: result.status === "skipped" ? "Scenario skipped; this step was not executed." : "Not reached during this attempt (for example, an earlier step or setup failed).", checks: [] };
    const skipped = actual.annotations?.some((annotation) => annotation.type === "skip");
    const checks = flatten(actual.steps).filter((step) => step.category === "expect").map((step) => ({ title: clean(step.title), parameters: parameters(step.params), status: step.error ? "Failed" : "Passed", error: step.error ? errorText(step.error) : undefined }));
    let observations = [], checkpoints = [], evidenceError;
    try {
      observations = attachedJSON([actual], "observed-comparison");
      checkpoints = attachedJSON([actual], "page-checkpoints").flat();
    } catch (error) { evidenceError = `Unreadable evidence for ${planned.id}: ${error.message}`; errors.push(evidenceError); }
    const operations = flatten(actual.steps).filter(step => step.category === "pw:api").map(step => ({
      title: clean(step.title), parameters: parameters(step.params),
      status: step.error ? "Failed" : "Completed", durationMs: step.duration,
      startedAt: step.startTime?.toISOString(), location: step.location,
      sourceSnapshot: step.location && existsSync(join(directory, "sources", `${relative(process.cwd(), step.location.file)}.txt`)) ? `sources/${relative(process.cwd(), step.location.file).split("\\").join("/")}.txt` : undefined,
      error: step.error ? errorText(step.error) : undefined,
    }));
    const failedCheck = checks.some(check => check.status === "Failed") || observations.some(observation => observation.matched === false);
    const status = skipped ? "Skipped" : actual.error || failedCheck || evidenceError ? (result.status === "interrupted" ? "Interrupted" : "Failed") : "Passed";
    return {
      id: planned.id, status, durationMs: actual.duration,
      verification: observations.length ? "Observed values compared" : checks.length ? "Assertions; no explicit value comparison attached" : "Actions only; expected result not independently verified in this step",
      actual: skipped ? "This step was skipped." : actual.error ? errorText(actual.error) : evidenceError || (failedCheck ? "An assertion or observed-value comparison failed." : observations.length ? `${observations.length} observed-value comparisons matched. See exact expected and observed values below.` : checks.length ? `${checks.length} assertions completed; recorded browser operations and checkpoints are shown separately.` : "Actions completed without error. The written expected result is not proven by this step alone."),
      checks, operations, observations, checkpoints,
    };
  });
  const unplanned = executed.filter((step) => !entry.steps.some((planned) => step.title.startsWith(`[${planned.id}] `)));
  if (unplanned.length) errors.push(`Unplanned steps were executed: ${unplanned.map((step) => step.title).join(", ")}`);
  let status = ({ passed: "Passed", skipped: "Skipped", interrupted: "Interrupted", timedOut: "Failed", failed: "Failed" })[result.status] || "Failed";
  if (status === "Passed" && (errors.length || steps.some((step) => step.status !== "Passed"))) {
    errors.push("The runner reported success, but one or more planned steps were missing, skipped or failed.");
    status = "Failed";
  }
  const attempt = {
    number: result.retry + 1, status, startedAt: result.startTime.toISOString(), durationMs: result.duration,
    errors, steps,
    attachments: (result.attachments || []).filter((attachment) => attachment.path).map((attachment) => ({
      name: attachment.name, contentType: attachment.contentType,
      path: relative(directory, attachment.path).split("\\").join("/"),
    })),
  };
  entry.attempts.push(attempt);
  entry.durationMs = entry.attempts.reduce((total, item) => total + item.durationMs, 0);
  entry.status = status === "Passed" && entry.attempts.some((item) => item.status !== "Passed") ? "Flaky" : status;
  entry.steps = entry.steps.map((planned, index) => ({ ...planned, ...steps[index] }));
  return attempt;
}

export function summarize(report) {
  const count = (items) => items.reduce((counts, item) => ({ ...counts, [item.status]: (counts[item.status] || 0) + 1 }), {});
  report.summary = {
    uniqueScenarios: new Set(report.scenarios.map((scenario) => scenario.id)).size,
    scenarioRuns: report.scenarios.length, scenarios: count(report.scenarios),
    plannedSteps: report.scenarios.reduce((total, scenario) => total + scenario.steps.length, 0),
    steps: count(report.scenarios.flatMap((scenario) => scenario.steps)),
    categories: Object.fromEntries([...new Set(report.scenarios.map(scenario => scenario.category))].map(category => [category || "Uncategorized", new Set(report.scenarios.filter(scenario => scenario.category === category).map(scenario => scenario.id)).size])),
    observedComparisons: report.scenarios.flatMap(scenario => scenario.steps).reduce((total, step) => total + (step.observations?.length || 0), 0),
    recordedOperations: report.scenarios.flatMap(scenario => scenario.steps).reduce((total, step) => total + (step.operations?.length || 0), 0),
  };
  return report;
}

export function finishReport(report, runnerStatus) {
  report.metadata.finishedAt = new Date().toISOString();
  report.metadata.durationMs = Date.parse(report.metadata.finishedAt) - Date.parse(report.metadata.startedAt);
  for (const scenario of report.scenarios) {
    if (scenario.status === "Running") scenario.status = runnerStatus === "interrupted" ? "Interrupted" : "Not run";
  }
  const failed = report.errors.length || report.stages.some((stage) => stage.status === "Failed") || report.scenarios.some((scenario) => ["Failed", "Flaky"].includes(scenario.status));
  report.status = failed ? "Failed" : runnerStatus === "interrupted" ? "Interrupted" : report.scenarios.every((scenario) => scenario.status === "Passed") ? "Passed" : "Incomplete";
  return summarize(report);
}

const badge = (status) => `<span class="badge ${status.toLowerCase().replaceAll(" ", "-")}">${escapeHTML(status)}</span>`;
const checksHTML = (checks = []) => checks.length ? `<details class="checks"><summary>${checks.length} assertion checks</summary><ul>${checks.map((check) => `<li>${badge(check.status)} ${escapeHTML(check.title)}${check.parameters ? `<pre>${escapeHTML(JSON.stringify(check.parameters, null, 2))}</pre>` : ""}${check.error ? `<pre>${escapeHTML(check.error)}</pre>` : ""}</li>`).join("")}</ul></details>` : "";
const evidenceHTML = (step) => `${(step.observations || []).map(observation => `<details class="observation" ${JSON.stringify(observation).length < 1000 ? "open" : ""}><summary><strong>${escapeHTML(observation.label)}</strong> ${observation.matched === false ? "— comparison failed" : "— matched"}</summary><p class="small">Expected</p><pre>${escapeHTML(JSON.stringify(observation.expected, null, 2))}</pre><p class="small">Observed ${observation.available === false ? "(unavailable)" : ""}</p><pre>${escapeHTML(JSON.stringify(observation.observed, null, 2))}</pre></details>`).join("")}
${step.operations?.length ? `<details class="checks"><summary>${step.operations.length} recorded browser/API operations (actions and reads)</summary><ol>${step.operations.map(operation => `<li><strong>${escapeHTML(operation.title)}</strong> ${badge(operation.status)} <span>${duration(operation.durationMs)}</span>${operation.parameters ? `<pre>${escapeHTML(JSON.stringify(operation.parameters, null, 2))}</pre>` : "<p>No parameters supplied by the runner for this operation.</p>"}${operation.location ? `<small>${operation.sourceSnapshot ? `<a href="${href(operation.sourceSnapshot)}">Saved source</a> · ` : ""}${escapeHTML(operation.location.file)}:${operation.location.line}</small>` : ""}${operation.error ? `<pre>${escapeHTML(operation.error)}</pre>` : ""}</li>`).join("")}</ol></details>` : ""}
${step.checkpoints?.length ? `<details class="checks"><summary>Observed page checkpoints: ${step.checkpoints.length} sessions</summary><pre>${escapeHTML(JSON.stringify(step.checkpoints, null, 2))}</pre></details>` : ""}`;

export function renderHTML(report) {
  summarize(report);
  const e = escapeHTML;
  const rows = (scenario, steps) => steps.map((step, index) => `<tr><td data-label="Step">${index + 1}<br><small>${e(step.id)}</small></td><td data-label="Planned instruction"><strong>${e(scenario.steps[index].action)}</strong><p class="expected">Expected: ${e(scenario.steps[index].expected)}</p><p class="small muted">This is the planned business instruction. See recorded operations for the commands that actually ran.</p></td><td data-label="Recorded outcome">${badge(step.status)}<p class="actual">${e(step.actual)}</p><p class="small muted">${e(step.verification || "Not executed")}</p>${evidenceHTML(step)}${checksHTML(step.checks)}</td><td data-label="Time">${duration(step.durationMs)}</td></tr>`).join("");
  const table = (scenario, steps) => `<div class="table-wrap"><table><thead><tr><th>Step</th><th>Planned instruction and expected result</th><th>Recorded outcome and evidence</th><th>Time</th></tr></thead><tbody>${rows(scenario, steps)}</tbody></table></div>`;
  const summary = report.summary;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(report.metadata.title)}</title><style>
  :root{font-family:system-ui,-apple-system,sans-serif;color:#203047;background:#f4f6fa;font-size:14px}*{box-sizing:border-box}body{margin:0}main{max-width:1240px;margin:auto;padding:32px 22px}h1{font-size:30px;margin:8px 0 12px}h2{font-size:20px}p{line-height:1.55}a{color:#204fc3}header,.panel,.scenario{background:white;border:1px solid #dce2ed;border-radius:12px;padding:22px;margin-bottom:18px}.eyebrow{letter-spacing:.1em;color:#516582;font-size:11px;font-weight:700}.muted,.expected{color:#52627a}.expected{font-size:13px;margin:8px 0}.actual{white-space:pre-wrap;margin:8px 0;font-size:13px}.meta{display:flex;flex-wrap:wrap;gap:8px 24px;font-size:13px}.stats{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0}.stat{border:1px solid #dce2ed;border-radius:8px;padding:12px 18px;min-width:130px}.stat strong{display:block;font-size:26px}.badge{display:inline-block;padding:3px 9px;border-radius:5px;background:#edf0f5;color:#3d4d66;font-weight:650;font-size:12px}.passed{background:#e1f4e9;color:#17613a}.failed{background:#fce5e6;color:#a12a35}.flaky,.interrupted{background:#fff0d2;color:#855709}.running{background:#e5edff;color:#284e9d}summary{cursor:pointer;line-height:1.5}.scenario>summary{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.scenario>summary strong{flex:1;min-width:200px}.small{font-size:12px}.table-wrap{overflow:auto}table{border-collapse:collapse;width:100%;margin-top:16px;table-layout:fixed}th,td{text-align:left;vertical-align:top;padding:13px 12px;border-bottom:1px solid #e5e9f0;overflow-wrap:anywhere}th{font-size:12px;color:#52627a;background:#f6f8fb}th:first-child{width:6%}th:nth-child(2){width:44%}th:nth-child(3){width:42%}th:last-child{width:8%}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f6f8fb;padding:12px;border-radius:6px;font-size:12px}.checks{margin-top:8px;font-size:12px}.checks ul{padding-left:18px}.checks li{margin:8px 0}.filters{display:flex;flex-wrap:wrap;gap:12px;align-items:center}.filters input{flex:1;min-width:180px}.filters input,.filters select{font:inherit;padding:10px;border:1px solid #cbd4e2;border-radius:7px}button{font:inherit;cursor:pointer;border:1px solid #cbd4e2;background:white;border-radius:7px;padding:9px 12px}.evidence{display:flex;gap:14px;flex-wrap:wrap;padding:12px 0}.hidden{display:none!important}.stages{display:grid;gap:10px}.stage{border-top:1px solid #e5e9f0;padding-top:10px}.stage summary{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.stage summary span:last-child{margin-left:auto}
  @media(max-width:650px){main{padding:16px 10px}header,.panel,.scenario{padding:16px}h1{font-size:24px}table,tbody,tr,td{display:block;width:100%}thead{display:none}tr{border-bottom:2px solid #dce2ed;padding:10px 0}td{border:0;padding:8px 0}td:before{content:attr(data-label);display:block;font-size:11px;color:#52627a;margin-bottom:5px}.stat{min-width:110px}.scenario>summary strong{min-width:100%}}
  @media print{body{background:white}main{max-width:none;padding:0}.filters,button{display:none}.scenario{break-inside:auto}details.scenario:not([open])>:not(summary){display:block!important}header,.panel,.scenario{border-radius:0;box-shadow:none}pre{font-size:10px}}
  </style></head><body><main><header><div class="eyebrow">BOTTLE NEXUS · QUALITY ASSURANCE</div><h1>User scenario execution report</h1>${badge(report.status)}<p>${e(report.metadata.scope)}</p><div class="meta"><span>Run: ${e(report.metadata.runId || "Browser run")}</span><span>Started: ${e(new Date(report.metadata.startedAt).toLocaleString("en-GB", { timeZone: report.metadata.timezone }))} (${e(report.metadata.timezone)})</span>${report.metadata.durationMs !== undefined ? `<span>Duration: ${duration(report.metadata.durationMs)}</span>` : ""}<span>Commit: ${e(report.metadata.commit || "not recorded")}${report.metadata.dirty ? " (working copy has changes)" : ""}</span></div><p class="small muted">${e(report.metadata.environment)}</p><div class="stats"><div class="stat"><strong>${summary.uniqueScenarios}</strong>scenarios</div><div class="stat"><strong>${summary.scenarioRuns}</strong>browser runs</div><div class="stat"><strong>${summary.scenarios.Passed || 0}</strong>passed runs</div><div class="stat"><strong>${summary.scenarios.Failed || 0}</strong>failed runs</div><div class="stat"><strong>${summary.plannedSteps}</strong>planned steps</div></div><p class="small">Run outcomes: ${e(Object.entries(summary.scenarios).map(([status, count]) => `${status}: ${count}`).join(" · "))}<br>Step outcomes: ${e(Object.entries(summary.steps).map(([status, count]) => `${status}: ${count}`).join(" · "))}</p><p class="small muted">Coverage categories: ${e(Object.entries(summary.categories).map(([category, count]) => `${category}: ${count}`).join(" · "))}. Recorded operations: ${summary.recordedOperations}; explicit observed-value comparisons: ${summary.observedComparisons}.</p><a href="report.json">Download structured report (JSON)</a>${report.metadata.sourceManifest ? ` · <a href="${href(report.metadata.sourceManifest)}">Saved test-source manifest</a><p class="small muted">Test-source SHA-256: ${e(report.metadata.testSourceSha256)}</p>` : ""} <button id="print">Print / save as PDF</button></header>
  ${report.stages.length ? `<section class="panel"><h2>Run checks</h2><div class="stages">${report.stages.map((stage) => `<details class="stage"><summary>${badge(stage.status)}<strong>${e(stage.title)}</strong><span>${duration(stage.durationMs || 0)}</span></summary><p><code>${e(stage.command)}</code></p>${stage.log ? `<a href="${href(stage.log)}">Full command log</a>` : ""}${stage.error ? `<pre>${e(stage.error)}</pre>` : ""}</details>`).join("")}</div></section>` : ""}
  ${report.errors.length ? `<section class="panel"><h2>Run errors</h2>${report.errors.map((error) => `<pre>${e(error)}</pre>`).join("")}</section>` : ""}
  <section class="panel filters"><label for="search">Find a scenario</label><input id="search" placeholder="Search scenario, role or step"><label for="status">Outcome</label><select id="status"><option value="">All outcomes</option>${["Passed", "Failed", "Flaky", "Skipped", "Not run", "Interrupted", "Running"].map((status) => `<option>${status}</option>`).join("")}</select><button id="expand">Expand all</button><button id="collapse">Collapse all</button><span id="visible" aria-live="polite"></span></section>
  ${report.scenarios.map((scenario, index) => `<details class="scenario" id="scenario-${index}" data-status="${e(scenario.status)}" ${scenario.status === "Failed" ? "open" : ""}><summary>${badge(scenario.status)}<strong>${e(scenario.id)} · ${e(scenario.title)}</strong><span class="small">${e(scenario.project)} · ${duration(scenario.durationMs)}</span></summary><p class="muted small">Category: ${e(scenario.category || "Uncategorized")} · Roles: ${e(scenario.roles.join(", "))} · Device: ${e(scenario.device)} · Attempts: ${scenario.attempts.length}</p>${scenario.preconditions ? `<p class="small muted">Preconditions: ${e(scenario.preconditions)}</p>` : ""}${scenario.attempts.length ? scenario.attempts.map((attempt) => `<section><h3>Attempt ${attempt.number} ${badge(attempt.status)}</h3>${attempt.errors.map((error) => `<pre>${e(error)}</pre>`).join("")}${table(scenario, attempt.steps)}${attempt.attachments.length ? `<div class="evidence">${attempt.attachments.map((attachment) => `<a href="${href(attachment.path)}">${e(attachment.name)} (${e(attachment.contentType)})</a>`).join("")}</div>` : ""}</section>`).join("") : table(scenario, scenario.steps)}</details>`).join("")}
  <p class="small muted">A passed business step means its commands and assertions completed, not that every phrase in the written plan was independently proven. Explicit comparisons show the actual value read and the expected value. Recorded operations come from Playwright, with the arguments supplied by the runner; some arguments may be omitted or truncated by Playwright. Page checkpoints are observations after the business step, not a reconstruction of intermediate states. API validation probes and server reads are labelled separately from user interactions. Not run, skipped and interrupted steps are never counted as passed. Every retry remains visible. Trace ZIP files can be inspected with npx playwright show-trace.</p></main><script>
  const cards=[...document.querySelectorAll('.scenario')];function filter(){const query=document.querySelector('#search').value.toLowerCase();const status=document.querySelector('#status').value;for(const card of cards)card.classList.toggle('hidden',!(card.textContent.toLowerCase().includes(query)&&(!status||card.dataset.status===status)));document.querySelector('#visible').textContent=cards.filter(c=>!c.classList.contains('hidden')).length+' runs shown'}document.querySelector('#search').addEventListener('input',filter);document.querySelector('#status').addEventListener('change',filter);document.querySelector('#expand').onclick=()=>cards.forEach(c=>c.open=true);document.querySelector('#collapse').onclick=()=>cards.forEach(c=>c.open=false);document.querySelector('#print').onclick=()=>window.print();filter();
  </script></body></html>`;
}

export function writeReport(directory, report) {
  mkdirSync(directory, { recursive: true });
  summarize(report);
  for (const [name, data] of [["report.json", JSON.stringify(report, null, 2)], ["report.html", renderHTML(report)]]) {
    const target = join(directory, name), temporary = `${target}.${randomUUID()}.tmp`;
    writeFileSync(temporary, data);
    renameSync(temporary, target);
  }
}

export function readReport(directory) {
  return JSON.parse(readFileSync(join(directory, "report.json"), "utf8"));
}
