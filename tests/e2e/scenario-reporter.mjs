import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { createReport, readReport, writeReport, recordAttempt, finishReport, clean } from "./scenario-report.mjs";

export default class ScenarioReporter {
  constructor({ outputDir = "test-results/scenario-report" } = {}) {
    this.directory = resolve(outputDir);
  }
  onBegin(config, suite) {
    this.report = existsSync(`${this.directory}/report.json`) ? readReport(this.directory) : createReport();
    this.entries = new Map();
    for (const test of suite.allTests()) {
      const id = test.annotations.find((annotation) => annotation.type === "scenario")?.description;
      const key = `${test.parent.project().name}:${id}`;
      const entry = this.report.scenarios.find((scenario) => scenario.key === key);
      if (!entry) { this.report.errors.push(`Test has no matching scenario plan: ${test.title}`); continue; }
      this.entries.set(test.id, entry);
    }
    writeReport(this.directory, this.report);
  }
  onTestBegin(test) {
    const entry = this.entries.get(test.id);
    if (entry) entry.status = "Running";
  }
  onTestEnd(test, result) {
    const entry = this.entries.get(test.id);
    if (entry) recordAttempt(entry, result, this.directory);
    writeReport(this.directory, this.report);
  }
  onError(error) {
    if (this.report) this.report.errors.push(clean(error.stack || error.message || error.value));
  }
  onEnd(result) {
    if (!this.report) this.report = createReport();
    finishReport(this.report, result.status);
    writeReport(this.directory, this.report);
    console.log(`\nScenario report: ${this.directory}/report.html`);
    if (this.report.status === "Failed") return { status: "failed" };
  }
  printsToStdio() { return true; }
}
