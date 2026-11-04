import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { scenarios, browserProjects } from "./e2e/scenario-plan.mjs";
import { createReport, recordAttempt, finishReport, renderHTML, writeReport, readReport } from "./e2e/scenario-report.mjs";

function result(entry, { status = "passed", count = entry.steps.length, failing = -1, retry = 0 } = {}) {
  return {
    status, retry, startTime: new Date("2026-11-04T12:00:00Z"), duration: 125,
    errors: failing >= 0 ? [{ message: "Expected saved record" }] : [], attachments: [],
    steps: entry.steps.slice(0, count).map((step, index) => ({
      title: `[${step.id}] ${step.action}`, category: "test.step", duration: 15,
      ...(index === failing ? { error: { message: "Expected saved record" } } : {}),
      steps: [{ title: "Expect record to be visible", category: "expect", duration: 10, ...(index === failing ? { error: { message: "No saved record found" } } : {}) }],
    })),
  };
}

test("the scenario plan contains unique scenarios and steps for every desktop/mobile run", () => {
  assert.equal(scenarios.length, 19);
  assert.equal(new Set(scenarios.map((scenario) => scenario.id)).size, 19);
  for (const scenario of scenarios) {
    assert.ok(scenario.roles.length);
    assert.ok(scenario.steps.length);
    assert.equal(new Set(scenario.steps.map((step) => step.id)).size, scenario.steps.length);
    assert.ok(scenario.steps.every((step) => step.action && step.expected));
  }
  const report = finishReport(createReport(), "finished");
  assert.equal(report.scenarios.length, scenarios.length * browserProjects.length);
  assert.equal(report.summary.scenarios["Not run"], scenarios.length * browserProjects.length);
  assert.equal(report.status, "Incomplete");
  assert.deepEqual(report.summary.categories, { "Role/navigation": 8, Workflow: 8, "Complex workflow": 3 });
});

test("recorded operations retain the actual locator, input value, time and source independently of the plan", () => {
  const entry = createReport().scenarios[0], run = result(entry);
  run.steps[0].steps.push({ category: "pw:api", title: 'Fill "Actual entered name"', params: { locator: 'getByLabel("Account name")', value: "Actual entered name" }, startTime: new Date("2026-11-04T12:00:01Z"), duration: 17, location: { file: "/workspace/real.spec.ts", line: 42, column: 3 } });
  recordAttempt(entry, run, "/tmp/report");
  assert.equal(entry.steps[0].operations[0].parameters.value, "Actual entered name");
  assert.equal(entry.steps[0].operations[0].parameters.locator, 'getByLabel("Account name")');
  assert.equal(entry.steps[0].operations[0].location.line, 42);
  assert.equal(entry.steps[0].operations[0].startedAt, "2026-11-04T12:00:01.000Z");
  assert.equal(entry.steps[0].verification, "Assertions; no explicit value comparison attached");
});

test("observed values are read from execution evidence, never copied from expected values", () => {
  const entry = createReport().scenarios[0], run = result(entry);
  run.steps[0].attachments = [{ name: "observed-comparison", body: Buffer.from(JSON.stringify({ label: "Saved owner", expected: "Maya", observed: "Sofia", available: true, matched: false })) }];
  recordAttempt(entry, run, "/tmp/report");
  assert.equal(entry.status, "Failed");
  assert.equal(entry.steps[0].status, "Failed");
  assert.equal(entry.steps[0].observations[0].observed, "Sofia");
  assert.equal(entry.steps[0].observations[0].expected, "Maya");
  assert.match(entry.steps[0].actual, /comparison failed/);
});

test("actions without assertions are explicitly distinguished from verification", () => {
  const entry = createReport().scenarios[0], run = result(entry);
  run.steps[0].steps = [];
  recordAttempt(entry, run, "/tmp/report");
  assert.match(entry.steps[0].verification, /Actions only/);
  assert.match(entry.steps[0].actual, /not proven/);
});

test("unreadable observation evidence fails instead of silently claiming accuracy", () => {
  const entry = createReport().scenarios[0], run = result(entry);
  run.steps[0].attachments = [{ name: "observed-comparison", body: Buffer.from("invalid JSON") }];
  recordAttempt(entry, run, "/tmp/report");
  assert.equal(entry.status, "Failed");
  assert.equal(entry.steps[0].status, "Failed");
  assert.match(entry.steps[0].actual, /Unreadable evidence/);
});

test("page checkpoints preserve actual session identities and form values", () => {
  const entry = createReport().scenarios[0], run = result(entry);
  run.steps[0].attachments = [{ name: "page-checkpoints", body: Buffer.from(JSON.stringify([{ session: 2, actor: "Account Manager — Sofia Chen", fields: [{ label: "Summary", value: "Actual draft" }] }])) }];
  recordAttempt(entry, run, "/tmp/report");
  assert.equal(entry.steps[0].checkpoints[0].actor, "Account Manager — Sofia Chen");
  assert.equal(entry.steps[0].checkpoints[0].fields[0].value, "Actual draft");
});

test("a failed assertion makes its business step fail even if the outer runner says passed", () => {
  const entry = createReport().scenarios[0], run = result(entry);
  run.steps[0].steps[0].error = { message: "Wrong stored status" };
  recordAttempt(entry, run, "/tmp/report");
  assert.equal(entry.status, "Failed");
  assert.equal(entry.steps[0].status, "Failed");
});

test("a failure keeps passed steps, the failing assertion and all unreached steps", () => {
  const entry = createReport().scenarios[0];
  recordAttempt(entry, result(entry, { status: "failed", count: 2, failing: 1 }), "/tmp/report");
  assert.deepEqual(entry.steps.map((step) => step.status), ["Passed", "Failed", "Not run", "Not run"]);
  assert.match(entry.steps[1].actual, /Expected saved record/);
  assert.equal(entry.steps[1].checks[0].status, "Failed");
  assert.equal(entry.attempts[0].errors.length, 1);
});

test("an incomplete success cannot be reported as a passed scenario", () => {
  const entry = createReport().scenarios[0];
  recordAttempt(entry, result(entry, { count: 1 }), "/tmp/report");
  assert.equal(entry.status, "Failed");
  assert.match(entry.attempts[0].errors[0], /planned steps/);
});

test("a passing retry is labelled flaky and retains the failed attempt", () => {
  const entry = createReport().scenarios[0];
  recordAttempt(entry, result(entry, { status: "failed", count: 1, failing: 0 }), "/tmp/report");
  recordAttempt(entry, result(entry, { retry: 1 }), "/tmp/report");
  assert.equal(entry.status, "Flaky");
  assert.equal(entry.attempts.length, 2);
  assert.equal(entry.attempts[0].status, "Failed");
  assert.equal(entry.attempts[1].number, 2);
  assert.ok(entry.steps.every((step) => step.status === "Passed"));
});

test("skipped and interrupted scenarios never turn unreached steps into passes", () => {
  for (const status of ["skipped", "interrupted"]) {
    const entry = createReport().scenarios[0];
    recordAttempt(entry, result(entry, { status, count: 0 }), "/tmp/report");
    assert.equal(entry.status, status === "skipped" ? "Skipped" : "Interrupted");
    assert.ok(entry.steps.every((step) => step.status === "Not run"));
  }
});

test("a build failure leaves every planned scenario visible as not run", () => {
  const report = createReport();
  report.stages.push({ title: "Build", status: "Failed", error: "Compilation failed" });
  finishReport(report, "finished");
  assert.equal(report.status, "Failed");
  assert.equal(report.summary.scenarios["Not run"], scenarios.length * browserProjects.length);
  assert.equal(report.summary.steps.Passed, undefined);
  const html = renderHTML(report);
  assert.match(html, /Compilation failed/);
  assert.match(html, /JOURNEY-08/);
});

test("the report escapes untrusted errors and writes standalone HTML and valid JSON atomically", () => {
  const directory = mkdtempSync(join(tmpdir(), "crm-report-test-"));
  try {
    const report = createReport();
    report.errors.push('<script>alert("error")</script>');
    finishReport(report, "failed");
    writeReport(directory, report);
    const html = renderHTML(report);
    assert.ok(!html.includes('<script>alert("error")</script>'));
    assert.match(html, /&lt;script&gt;/);
    assert.deepEqual(readReport(directory).summary, report.summary);
    assert.deepEqual(readdirSync(directory).sort(), ["report.html", "report.json"]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
